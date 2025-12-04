import { a, defineData } from "@aws-amplify/backend";

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
            // any signed-in user can interact with Resume
            allow.authenticated(),
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
            // only authenticated users can see/redeem codes
            allow.authenticated(),
        ]),
    // NEW: Suggestion / feedback
    Suggestion: a.model ({
        message: a.string().required(),
        page: a.string(),
        userEmail: a.string(),
        createdAt: a.datetime(),
    })
        .authorization((allow) => [
            allow.authenticated(),
        ]),

    accessByCode: a
        .query()
        .arguments({
            code: a.string().required(),
        })
        .returns(a.ref("AccessCode"))
        // ✅ THIS is what was missing:
        .authorization((allow) => [
            allow.authenticated(), // only logged-in users can call this
        ])
        .handler(a.handler.function("accessByCode")),
});

export const data = defineData({
    schema,
});

// Optional: shared type if you ever want it on the frontend
export type Schema = typeof schema;