import type { AppSyncResolverHandler } from "aws-lambda";
import Stripe from "stripe";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/billing";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const dataClient = generateClient<Schema>();
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

type BillingArgs = { action: "status" | "checkout" | "redeem"; plan?: "unlimited" | "credits"; code?: string };

export const handler: AppSyncResolverHandler<BillingArgs, any> = async (event) => {
    const identity = event.identity as { sub?: string; claims?: Record<string, unknown> } | undefined;
    const ownerSub = identity?.sub;
    const email = String(identity?.claims?.email || "");
    if (!ownerSub) throw new Error("UNAUTHENTICATED");

    const { data: entitlement } = await dataClient.models.Entitlement.get({ ownerSub });

    if (event.arguments.action === "status") {
        return {
            checkoutUrl: null,
            credits: entitlement?.credits || 0,
            unlimitedExpiresAt: entitlement?.unlimitedExpiresAt || null,
        };
    }

    if (event.arguments.action === "redeem") {
        const code = event.arguments.code?.trim();
        if (!code) throw new Error("INVALID_CODE");
        const { data: codes } = await dataClient.models.AccessCode.list({ filter: { code: { eq: code } } });
        const accessCode = codes?.[0];
        if (!accessCode) throw new Error("INVALID_CODE");
        if (accessCode.expiresAt && new Date(accessCode.expiresAt).getTime() <= Date.now()) throw new Error("CODE_EXPIRED");
        if ((accessCode.usedCount || 0) >= accessCode.maxUses) throw new Error("CODE_EXHAUSTED");

        const now = new Date();
        const currentExpiry = entitlement?.unlimitedExpiresAt ? new Date(entitlement.unlimitedExpiresAt) : null;
        const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
        base.setDate(base.getDate() + accessCode.days);
        const values = {
            credits: (entitlement?.credits || 0) + accessCode.credits,
            unlimitedExpiresAt: base.toISOString(),
        };
        await dataClient.models.AccessCode.update({ id: accessCode.id, usedCount: (accessCode.usedCount || 0) + 1 });
        if (entitlement) await dataClient.models.Entitlement.update({ ownerSub, ...values });
        else await dataClient.models.Entitlement.create({ ownerSub, ...values });
        return { checkoutUrl: null, ...values };
    }

    const plan = event.arguments.plan;
    if (plan !== "unlimited" && plan !== "credits") throw new Error("INVALID_PLAN");
    const price = plan === "unlimited" ? env.STRIPE_UNLIMITED_PRICE_ID : env.STRIPE_CREDITS_PRICE_ID;
    const appUrl = env.APP_URL.replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price, quantity: 1 }],
        success_url: `${appUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}?payment=cancelled`,
        client_reference_id: ownerSub,
        customer_email: email || undefined,
        metadata: { ownerSub, plan },
    });

    return {
        checkoutUrl: session.url,
        credits: entitlement?.credits || 0,
        unlimitedExpiresAt: entitlement?.unlimitedExpiresAt || null,
    };
};
