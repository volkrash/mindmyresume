// amplify/functions/rewriteResume/handler.js
// ESM handler for Amplify Lambda URL + OpenAI

import OpenAI from "openai";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/rewriteResume";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const dataClient = generateClient();

// Make sure OPENAI_API_KEY is set in this function's environment
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

function buildCorsHeaders() {
    return {
        "Content-Type": "application/json",
        // IMPORTANT: don't set Access-Control-Allow-Origin here.
        // The Lambda Function URL CORS config will add it for us.
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
    };
}

export const handler = async (event) => {
    const isAppSync = Boolean(event?.arguments);
    const origin =
        event?.headers?.origin ||
        event?.headers?.Origin ||
        event?.requestContext?.http?.sourceIp ||
        "*";

    const headers = buildCorsHeaders();

    try {
        // CORS preflight
        if (event.requestContext?.http?.method === "OPTIONS") {
            return {
                statusCode: 204,
                headers,
                body: "",
            };
        }

        if (!env.OPENAI_API_KEY) {
            console.error("Missing OPENAI_API_KEY env var");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "INTERNAL_ERROR",
                    details: "OPENAI_API_KEY is not configured in the Lambda environment.",
                }),
            };
        }

        if (!isAppSync && !event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Missing body" }),
            };
        }

        let parsed;
        try {
            parsed = isAppSync
                ? event.arguments
                : typeof event.body === "string"
                    ? JSON.parse(event.body || "{}")
                    : event.body || {};
        } catch (e) {
            console.error("Invalid JSON body:", e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Invalid JSON body" }),
            };
        }

        const resumeText = parsed.resumeText;
        const jobDescription = parsed.jobDescription || "";
        const evidenceNotes = parsed.evidenceNotes || "";
        const action = parsed.action === "analyze" ? "analyze" : "rewrite";
        const language = parsed.language === "es" ? "es" : "en";
        const mode = parsed.mode === "federal" ? "federal" : "standard";

        if (!resumeText || typeof resumeText !== "string") {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "resumeText is required" }),
            };
        }

        // Normalize mode + language
        const normalizedMode = mode === "federal" ? "federal" : "standard";
        const isSpanish = language === "es";

        let entitlement = null;
        if (isAppSync) {
            const ownerSub = event.identity?.sub;
            if (!ownerSub) throw new Error("UNAUTHENTICATED");
            const { data } = await dataClient.models.Entitlement.get({ ownerSub });
            entitlement = data || null;
            const unlimitedActive = entitlement?.unlimitedExpiresAt
                && new Date(entitlement.unlimitedExpiresAt).getTime() > Date.now();
            if (!unlimitedActive && (entitlement?.credits || 0) <= 0) {
                throw new Error("PAYMENT_REQUIRED");
            }
        }

        if (action === "analyze") {
            if (!jobDescription.trim()) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "jobDescription is required for analysis" }),
                };
            }

            const analysisCompletion = await openai.chat.completions.create({
                model: "chatgpt-4o-latest",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `You are a rigorous job-application analyst. Compare a candidate resume with a target job. Never infer, embellish, or invent experience. Return JSON only with this exact shape: {"summary":"string","requirements":[{"requirement":"string","importance":"required|preferred","status":"supported|partial|missing","evidence":"string","question":"string"}],"strengths":["string"],"risks":["string"]}. Evidence must identify facts present in the resume. If evidence is absent, use an empty string and ask one concise question that could uncover truthful relevant experience. Keep at most 10 requirements, ordered by importance. Write all user-facing values in ${isSpanish ? "Spanish" : "American English"}.`,
                    },
                    {
                        role: "user",
                        content: `CANDIDATE RESUME:\n${resumeText}\n\nTARGET JOB DESCRIPTION:\n${jobDescription}`,
                    },
                ],
                temperature: 0.1,
                max_tokens: 1800,
            });

            const rawAnalysis = analysisCompletion?.choices?.[0]?.message?.content || "{}";
            const result = { analysis: JSON.parse(rawAnalysis) };
            if (isAppSync) return result;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result),
            };
        }

// ---- SYSTEM PROMPT ----
        const baseSystemPrompt = `
You are an expert resume writer for MindMyResume.
Your job is to rewrite and structure resumes so they are clear, professional, and ATS-friendly.

GLOBAL FORMATTING RULES (MUST FOLLOW ALL):
- OUTPUT PLAIN TEXT ONLY (no Markdown, no HTML, no tables).
- Use simple ALL-CAPS section headings (e.g., "PROFESSIONAL PROFILE", "EXPERIENCE").
- Use bullet points that start with "• " (a single bullet + space).
- Put ONE bullet per line.
- Put a SINGLE blank line between sections and between the last bullet/paragraph and the next heading.
- DO NOT use asterisks (*), hyphens (-), underscores (___), or lines of symbols for decoration or dividers.
- DO NOT create multi-column layouts or complex formatting.
- Keep the text easy to copy-paste into plain text editors.
`.trim();

        const standardModeDetails = `
When mode is STANDARD:
- Produce a modern, ATS-friendly corporate resume.
- Recommended sections: PROFESSIONAL PROFILE, AREAS OF EXPERTISE (or SKILLS), EXPERIENCE, EDUCATION, and CERTIFICATIONS / TRAINING (if applicable).
- Focus on measurable achievements (numbers, percentages, impact).
- Reuse and elevate content from the original resume; do NOT invent experience the candidate cannot plausibly claim.
- Naturally incorporate key skills and keywords from the job description where they reflect the candidate's background.
`.trim();

        const federalModeDetails = `
When mode is FEDERAL:
- Produce a federal-style resume aligned with USAJOBS expectations.
- Use clear sections such as: SUMMARY, CORE COMPETENCIES, WORK EXPERIENCE, EDUCATION, CERTIFICATIONS / TRAINING, and other relevant sections.
- Under WORK EXPERIENCE for each job, include only facts explicitly supplied by the candidate:
  • Job Title
  • Employer, City, State
  • Start Month/Year – End Month/Year (or "Present")
  • Hours per week (e.g., "Hours per week: 40") — if missing, omit it; never estimate it.
  • Supervisor (if known) and contact permission line (e.g., "Supervisor: John Doe | Contact: Yes" or "Contact: No").
  • Bullet points highlighting specialized experience and accomplishments.
- Use strong language similar to federal announcements (e.g., "independently coordinates", "leads", "advises management", "analyzes", "implements").
- Mirror specialized experience and keywords from the job description where they truthfully apply to the candidate.
- Keep the complete federal resume to two pages or less and prioritize the qualifications in the announcement.
- Include scope, systems used, tools, and specific outcomes only when supported by candidate-provided facts.
`.trim();

        const englishDetails = `
Language: American English.
- Write the entire resume in American English.
- Use a neutral, professional tone suitable for US hiring managers.
`.trim();

        const spanishDetails = `
Language: Spanish.
- Write the entire resume in neutral, professional Spanish (no regional slang).
- Use standard resume wording.
`.trim();

// Final system prompt that goes into the "system" role
        const systemPrompt = [
            baseSystemPrompt,
            normalizedMode === "federal" ? federalModeDetails : standardModeDetails,
            isSpanish ? spanishDetails : englishDetails,
        ].join("\n\n");

// ---- USER MESSAGE ----
        const userContent = `
MODE: ${normalizedMode.toUpperCase()}
LANGUAGE: ${isSpanish ? "SPANISH" : "ENGLISH"}

CANDIDATE RAW RESUME:
${resumeText}

TARGET JOB DESCRIPTION (if provided):
${jobDescription || "N/A"}

CANDIDATE-SUPPLIED EVIDENCE NOTES:
${evidenceNotes || "N/A"}

TASK:
Rewrite the entire resume following ALL rules from the system instructions.

Remember:
- Plain text only.
- Simple ALL-CAPS section headings.
- Bullets must start with "• " and one bullet per line.
- Single blank line between sections.
- No decorative lines, no asterisks, no hyphen dividers.
- Use only facts found in the raw resume or candidate-supplied evidence notes.
- Never invent or estimate metrics, dates, hours per week, credentials, job titles, employers, tools, or responsibilities.
`.trim();

        // Call OpenAI (use a valid model)
        const completion = await openai.chat.completions.create({
            model: "chatgpt-4o-latest", // <-- valid model
            messages: [
                { role: "system", content: systemPrompt.trim() },
                { role: "user", content: userContent },
            ],
            temperature: 0.4,
            max_tokens: 2200,
        });

        const rewrittenText =
            completion?.choices?.[0]?.message?.content?.trim() || "";

        if (!rewrittenText) {
            console.error("Empty completion from OpenAI:", completion);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "INTERNAL_ERROR",
                    details: "OpenAI returned an empty response.",
                }),
            };
        }

        if (isAppSync) {
            const unlimitedActive = entitlement?.unlimitedExpiresAt
                && new Date(entitlement.unlimitedExpiresAt).getTime() > Date.now();
            if (!unlimitedActive && entitlement?.id) {
                const nextCredits = Math.max(0, (entitlement.credits || 0) - 1);
                await dataClient.models.Entitlement.update({
                    ownerSub: event.identity.sub,
                    credits: nextCredits,
                });
            }
            return { rewrittenText };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                rewrittenText,
                jobDescription,
                language,
                mode,
            }),
        };
    } catch (err) {
        console.error("Rewrite Lambda error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "INTERNAL_ERROR",
                details:
                    typeof err === "object" && err && "message" in err
                        ? err.message
                        : String(err),
            }),
        };
    }
};
