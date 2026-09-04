import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rewriteResume } from "./functions/rewriteResume/resource";
import { billing } from "./functions/billing/resource";
import { stripeWebhook } from "./functions/stripeWebhook/resource";
import { FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";

export const backend = defineBackend({
    auth,
    data,
    rewriteResume,
    billing,
    stripeWebhook,
});

const webhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
    authType: FunctionUrlAuthType.NONE,
    cors: {
        allowedMethods: [HttpMethod.POST],
        allowedOrigins: ["*"],
    },
});

backend.addOutput({
    custom: {
        stripeWebhookUrl: webhookUrl.url,
    },
});
