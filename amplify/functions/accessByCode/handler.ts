// amplify/functions/accessByCode/handler.ts
import type { AppSyncResolverHandler } from "aws-lambda";
import { generateClient } from "aws-amplify/data";

// Force the data client to "any" so TS doesn't complain about AccessCode
const dataClient: any = generateClient();

interface AccessCodeRecord {
    id: string;
    code: string;
    days: number;
    credits: number;
    maxUses: number;
    usedCount: number;
    expiresAt?: string | null;
}

interface AccessCodeByCodeArgs {
    code: string;
}

export const handler: AppSyncResolverHandler<
    AccessCodeByCodeArgs,
    AccessCodeRecord | null
> = async (event) => {
    const { code } = event.arguments;

    // 1) Find code by "code" field
    const { data, errors } = await dataClient.models.AccessCode.list({
        filter: {
            code: { eq: code },
        },
    });

    if (errors?.length) {
        console.error("AccessCode list errors:", errors);
        throw new Error("Failed to look up access code");
    }

    const record = (data?.[0] ?? null) as AccessCodeRecord | null;

    if (!record) {
        throw new Error("INVALID_CODE");
    }

    const nowIso = new Date().toISOString();

    // 2) Validate expiration
    if (record.expiresAt && record.expiresAt < nowIso) {
        throw new Error("CODE_EXPIRED");
    }

    // 3) Validate maxUses
    if (record.usedCount >= record.maxUses) {
        throw new Error("CODE_EXHAUSTED");
    }

    // 4) Increment usedCount atomically
    const { data: updated, errors: updateErrors } =
        await dataClient.models.AccessCode.update({
            id: record.id,
            usedCount: record.usedCount + 1,
        });

    if (updateErrors?.length || !updated) {
        console.error("AccessCode update errors:", updateErrors);
        throw new Error("FAILED_TO_CONSUME_CODE");
    }

    // Return updated record (with days & credits, etc.)
    return updated as AccessCodeRecord;
};