import type { Schema } from "../../data/resource"; // adjust path if needed
import { generateClient } from "aws-amplify/data";

const dataClient = generateClient<Schema>();

export const handler: Schema["accessCodeByCode"]["functionHandler"] = async (
    event
) => {
    const rawCode = event.arguments.code ?? "";
    const code = rawCode.trim();

    if (!code) {
        throw new Error("INVALID_CODE");
    }

    // Look up by code (simple filter; for lots of codes you can add an @index later)
    const { data, errors } = await dataClient.models.AccessCode.list({
        filter: { code: { eq: code } },
        limit: 1,
    });

    if (errors && errors.length > 0) {
        console.error("AccessCode list errors", errors);
        throw new Error("INTERNAL_ERROR");
    }

    const record = data[0];

    if (!record) {
        throw new Error("INVALID_CODE");
    }

    const now = new Date();

    if (record.expiresAt && new Date(record.expiresAt) < now) {
        throw new Error("CODE_EXPIRED");
    }

    if (record.usedCount >= record.maxUses) {
        throw new Error("CODE_ALREADY_USED");
    }

    // Increment usedCount atomically
    const { data: updated, errors: updateErrors } =
        await dataClient.models.AccessCode.update({
            id: record.id,
            usedCount: record.usedCount + 1,
        });

    if (updateErrors && updateErrors.length > 0) {
        console.error("AccessCode update errors", updateErrors);
        throw new Error("INTERNAL_ERROR");
    }

    return updated;
};
