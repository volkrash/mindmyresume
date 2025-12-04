import { a, defineData } from "@aws-amplify/backend";

export const data = defineData({
    schema: a.schema({
        Resume: a
            .model({
                ownerId: a.string().authorization((allow) => allow.owner()), // tie to user
                title: a.string(),
                language: a.string(), // "en" | "es"
                aiJson: a.json(),
                createdAt: a.datetime(),
                expiresAt: a.datetime(), // we'll store 2-years-later here
            }),
        AccessCode: a
            .model({
                code: a.string().required(),       // human code: "PILOT-2025-ANGEL"
                days: a.integer().required(),      // how many days of access to grant
                credits: a.integer().required(),   // how many AI credits to add
                maxUses: a.integer().required(),   // e.g. 1 for single-use, 10 for multi
                usedCount: a.integer().default(0),
                expiresAt: a.datetime().optional(), // optional expiry date for the code
            })
            .authorization((allow) => [
                allow.authenticated(),             // only logged-in users can redeem
                // add allow.guest() if you want guests to redeem too
            ]),

        accessCodeByCode: a
            .query()
            .arguments({
                code: a.string().required(),
            })
            .returns(a.ref("AccessCode"))
            .handler(a.handler.function("accessCodeByCode")),
    });