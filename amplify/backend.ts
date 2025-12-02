import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rewriteResume } from "./functions/rewriteResume/resource";

export const backend = defineBackend({
    auth,
    data,
    rewriteResume,
});

