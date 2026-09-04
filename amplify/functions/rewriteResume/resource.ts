// amplify/functions/rewriteResume/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const rewriteResume = defineFunction({
    name: "rewriteResume",
    entry: "./handler.js",      // ✅ important
    environment: {
        OPENAI_API_KEY: secret("OPENAI_API_KEY"),
    },
});

