// amplify/functions/rewriteResume/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const rewriteResume = defineFunction({
    name: "rewriteResume",
    entry: "./handler.js",      // ✅ important
    environment: {
        OPENAI_API_KEY: "OPENAI_API_KEY",
    },
});


