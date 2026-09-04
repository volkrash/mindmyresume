import type { AppSyncResolverHandler } from "aws-lambda";
import Stripe from "stripe";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";

const functionEnv = process.env as Record<string, string>;
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(functionEnv as any);
Amplify.configure(resourceConfig, libraryOptions);
// Resource-authorized models are intentionally omitted from the public client
// surface. The Lambda's IAM role still enforces access at runtime.
const dataClient = generateClient<any>();
const stripe = new Stripe(functionEnv.STRIPE_SECRET_KEY);

type BillingArgs = { action: "status" | "checkout" | "redeem"; plan?: "unlimited" | "credits"; code?: string };

export const handler: AppSyncResolverHandler<BillingArgs, any> = async (event) => {
    const identity = event.identity as { sub?: string; claims?: Record<string, unknown> } | undefined;
    const ownerSub = identity?.sub;
    const email = String(identity?.claims?.email || "");
    if (!ownerSub) throw new Error("UNAUTHENTICATED");

    const { data: entitlement } = await dataClient.models.Entitlement.get({ ownerSub }) as { data: any };

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
        const { data: codes } = await dataClient.models.AccessCode.list({ filter: { code: { eq: code } } }) as { data: any[] };
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
    const price = plan === "unlimited" ? functionEnv.STRIPE_UNLIMITED_PRICE_ID : functionEnv.STRIPE_CREDITS_PRICE_ID;
    const appUrl = functionEnv.APP_URL.replace(/\/$/, "");
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
