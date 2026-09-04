import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import Stripe from "stripe";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/stripe-webhook";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const dataClient = generateClient<Schema>();
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const signature = event.headers?.["stripe-signature"];
    if (!signature || !event.body) return { statusCode: 400, body: "Missing signature" };

    let stripeEvent: Stripe.Event;
    try {
        const rawBody = event.isBase64Encoded
            ? Buffer.from(event.body, "base64")
            : Buffer.from(event.body, "utf8");
        stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        console.error("Invalid Stripe signature", error);
        return { statusCode: 400, body: "Invalid signature" };
    }

    if (stripeEvent.type !== "checkout.session.completed") {
        return { statusCode: 200, body: "Ignored" };
    }

    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return { statusCode: 200, body: "Not paid" };
    const ownerSub = session.metadata?.ownerSub || session.client_reference_id;
    const plan = session.metadata?.plan;
    if (!ownerSub || (plan !== "unlimited" && plan !== "credits")) {
        return { statusCode: 400, body: "Missing fulfillment metadata" };
    }

    const { data: priorEvent } = await dataClient.models.PaymentEvent.get({ stripeEventId: stripeEvent.id });
    if (priorEvent) return { statusCode: 200, body: "Already fulfilled" };

    const { errors: claimErrors } = await dataClient.models.PaymentEvent.create({
        stripeEventId: stripeEvent.id,
        stripeSessionId: session.id,
        ownerSub,
        plan,
        processedAt: new Date().toISOString(),
    });
    if (claimErrors?.length) return { statusCode: 200, body: "Already processing" };

    const { data: current } = await dataClient.models.Entitlement.get({ ownerSub });
    const now = new Date();
    const currentExpiry = current?.unlimitedExpiresAt ? new Date(current.unlimitedExpiresAt) : null;
    const base = currentExpiry && currentExpiry > now ? currentExpiry : now;

    const nextValues = plan === "unlimited"
        ? { credits: current?.credits || 0, unlimitedExpiresAt: new Date(base.setDate(base.getDate() + 90)).toISOString() }
        : { credits: (current?.credits || 0) + 5, unlimitedExpiresAt: current?.unlimitedExpiresAt || null };

    try {
        if (current) await dataClient.models.Entitlement.update({ ownerSub, ...nextValues });
        else await dataClient.models.Entitlement.create({ ownerSub, ...nextValues });
    } catch (error) {
        await dataClient.models.PaymentEvent.delete({ stripeEventId: stripeEvent.id });
        throw error;
    }

    return { statusCode: 200, body: "Fulfilled" };
};
