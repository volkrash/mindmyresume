import { a, defineData } from "@aws-amplify/backend";
import { billing } from "../functions/billing/resource";
import { stripeWebhook } from "../functions/stripeWebhook/resource";
import { rewriteResume } from "../functions/rewriteResume/resource";

const schema = a.schema({
    Resume: a
        .model({
            ownerId: a.string(),
            title: a.string(),
            language: a.string(),  // "en" | "es"
            aiJson: a.json(),
            createdAt: a.datetime(),
            expiresAt: a.datetime(),
        })
        .authorization((allow) => [
            allow.owner(),
        ]),

    AccessCode: a
        .model({
            code: a.string().required(),       // human code: "PILOT-2025-ANGEL"
            days: a.integer().required(),      // days of access to grant
            credits: a.integer().required(),   // AI credits to add
            maxUses: a.integer().required(),   // 1 = single use, >1 = multi-use
            usedCount: a.integer().default(0),
            // optional expiry; leaving off `.required()` makes it optional
            expiresAt: a.datetime(),
        })
        .authorization((allow) => [
            allow.resource(billing),
            allow.group("ADMINS"),
        ]),
    // NEW: Suggestion / feedback
    Suggestion: a.model ({
        message: a.string().required(),
        page: a.string(),
        userEmail: a.string(),
        createdAt: a.datetime(),
    })
        .authorization((allow) => [
            allow.owner(),
            allow.group("ADMINS").to(["read", "delete"]),
        ]),

    Entitlement: a.model({
        ownerSub: a.string().required(),
        credits: a.integer().default(0),
        unlimitedExpiresAt: a.datetime(),
    }).identifier(["ownerSub"]).authorization((allow) => [
        allow.resource(billing),
        allow.resource(stripeWebhook),
        allow.resource(rewriteResume),
    ]),

    PaymentEvent: a.model({
        stripeEventId: a.string().required(),
        stripeSessionId: a.string().required(),
        ownerSub: a.string().required(),
        plan: a.string().required(),
        processedAt: a.datetime().required(),
    }).identifier(["stripeEventId"]).authorization((allow) => [allow.resource(stripeWebhook)]),

    BillingResult: a.customType({
        checkoutUrl: a.url(),
        credits: a.integer().required(),
        unlimitedExpiresAt: a.datetime(),
    }),

    billing: a.query()
        .arguments({
            action: a.enum(["status", "checkout", "redeem"]),
            plan: a.enum(["unlimited", "credits"]),
            code: a.string(),
        })
        .returns(a.ref("BillingResult"))
        .authorization((allow) => [allow.authenticated()])
        .handler(a.handler.function(billing)),

    applicationAssistant: a.mutation()
        .arguments({
            action: a.enum(["analyze", "rewrite"]),
            resumeText: a.string().required(),
            jobDescription: a.string(),
            evidenceNotes: a.string(),
            language: a.enum(["en", "es"]),
            mode: a.enum(["standard", "federal"]),
        })
        .returns(a.json())
        .authorization((allow) => [allow.authenticated()])
        .handler(a.handler.function(rewriteResume)),

});

export const data = defineData({
    schema,
});

// Optional: shared type if you ever want it on the frontend
export type Schema = typeof schema;
