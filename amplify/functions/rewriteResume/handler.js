// amplify/functions/rewriteResume/handler.js
// ESM handler for Amplify Lambda URL + OpenAI

import OpenAI from "openai";

// Make sure OPENAI_API_KEY is set in this function's environment
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

        if (!process.env.OPENAI_API_KEY) {
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

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Missing body" }),
            };
        }

        let parsed;
        try {
            parsed =
                typeof event.body === "string"
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
        const language = parsed.language === "es" ? "es" : "en";
        const mode = parsed.mode === "federal" ? "federal" : "standard";

        if (!resumeText || typeof resumeText !== "string") {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "resumeText is required" }),
            };
        }

        const isSpanish = language === "es";

        const systemPromptEn = `
You are a professional resume writer.

Goal:
Rewrite the provided resume into a clean, ATS-friendly, professional resume in plain text.

Formatting rules (VERY IMPORTANT):
- Do NOT use asterisks (*), hyphen lines (---), or markdown.
- Do NOT use ASCII art, boxes, or decorative characters.
- Use simple section headings in ALL CAPS (e.g., PROFESSIONAL PROFILE, EXPERIENCE, EDUCATION).
- Use standard bullet points with "• " (bullet + space) at the start of each bullet line.
- Keep exactly ONE blank line between sections.
- Use normal punctuation and capitalization.
- Do NOT invent jobs, companies, or dates.
- You may tighten wording, remove fluff, and fix grammar, but keep facts realistic.

If a job description is provided, tailor the resume toward that role (keywords, emphasis) while staying truthful.
`;

        const systemPromptEs = `
Eres un redactor profesional de currículums.

Objetivo:
Reescribe el currículum proporcionado en un formato claro, profesional y compatible con sistemas ATS, todo en texto plano.

Reglas de formato (MUY IMPORTANTE):
- NO uses asteriscos (*), líneas de guiones (---) ni markdown.
- NO uses arte ASCII, cajas ni caracteres decorativos.
- Usa encabezados de sección en MAYÚSCULAS (por ejemplo, PERFIL PROFESIONAL, EXPERIENCIA, EDUCACIÓN).
- Usa viñetas estándar con "• " (viñeta + espacio) al inicio de cada línea con viñeta.
- Deja EXACTAMENTE una línea en blanco entre secciones.
- Usa puntuación y mayúsculas normales.
- NO inventes puestos, empresas ni fechas.
- Puedes mejorar redacción, quitar relleno y corregir gramática, pero mantén los hechos realistas.

Si se proporciona una descripción de puesto, adapta el currículum hacia ese rol (palabras clave, énfasis) sin inventar información.
`;

        const systemPrompt = isSpanish ? systemPromptEs : systemPromptEn;

        // Build user content with optional JD
        let userContent = `${isSpanish ? "Currículum original:" : "Original resume:"}\n\n${resumeText.trim()}`;

        if (jobDescription && jobDescription.trim()) {
            userContent += `\n\n${
                isSpanish ? "Descripción del puesto objetivo:" : "Target job description:"
            }\n\n${jobDescription.trim()}`;
        }

        if (mode === "federal") {
            userContent += `\n\n${
                isSpanish
                    ? "IMPORTANTE: Formatea el currículum siguiendo el estilo general de USAJOBS, con énfasis en logros cuantificables, horas por semana y responsabilidades clave. Aun así, respeta todas las reglas de formato indicadas."
                    : "IMPORTANT: Format the resume following the general style of USAJOBS federal resumes (quantifiable achievements, hours per week, key responsibilities) while still respecting all the formatting rules above."
            }`;
        }

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
