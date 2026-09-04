import { defineFunction, secret } from "@aws-amplify/backend";

export const billing = defineFunction({
    name: "billing",
    entry: "./handler.ts",
    environment: {
        STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
        STRIPE_UNLIMITED_PRICE_ID: secret("STRIPE_UNLIMITED_PRICE_ID"),
        STRIPE_CREDITS_PRICE_ID: secret("STRIPE_CREDITS_PRICE_ID"),
        APP_URL: secret("APP_URL"),
    },
});
