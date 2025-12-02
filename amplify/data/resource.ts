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
            })
            .authorization((allow) => [allow.owner()]),
    }),
});
