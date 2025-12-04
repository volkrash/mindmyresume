// amplify/functions/rewriteResume/handler.js

import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function corsHeaders() {
    // You can hard-code your prod origin later if you want
    //const allowedOrigin = origin || "*";

    return {
        "Content-Type": "application/json",
        //"Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
    };
}

export const handler = async (event) => {
    // Try to capture caller origin (for non-local usage)
    const headers = corsHeaders();

    try {
        // Handle CORS preflight
        if (event.requestContext?.http?.method === "OPTIONS") {
            return {
                statusCode: 204,
                headers,
                body: "",
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
        const language = parsed.language || "en"; // "en" | "es"
        const mode = parsed.mode || "standard";   // "standard" | "federal" (future)

        if (!resumeText || typeof resumeText !== "string") {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "resumeText is required" }),
            };
        }

        // ------------- REAL OPENAI CALL -------------
        const isSpanish = language === "es";

        const systemPrompt =
            mode === "federal"
                ? (isSpanish
                    ? `Eres un experto en currículums para empleos federales del gobierno de EE. UU. 
Devuelves UN SOLO texto de currículum en formato listo para pegar, usando el idioma español pero siguiendo los requisitos de un currículum federal: 
• Secciones claras (Información de contacto, Puesto objetivo, Experiencia laboral detallada con horas por semana, Fechas, Salario si está disponible, Supervisor, Permiso para contactar, Educación, Certificaciones, Habilidades técnicas, etc.). 
• Incluye detalles cuantificables siempre que sea posible.
Adapta el currículum a la descripción del puesto que se proporciona.`
                    : `You are an expert in federal government resumes for U.S. jobs. 
Return ONE resume text, ready to paste, in English, following federal resume requirements:
• Clear sections (Contact Information, Objective/Position Title, Detailed Work Experience with hours per week, dates, salary if known, supervisor & may-contact flag, Education, Certificates, Technical Skills, etc.).
• Include quantified impact where possible.
Tailor the resume to the provided job description.`)
                : (isSpanish
                    ? `Eres un experto en currículums modernos y profesionales. 
Devuelves UN SOLO texto de currículum en español, claro y listo para pegar.
Adapta el contenido al puesto objetivo usando la descripción del trabajo.`
                    : `You are an expert in modern, professional resumes.
Return ONE resume text, in English, clear and ready to paste.
Tailor the content to the target role using the job description.`);

        const userPrompt = `
LANGUAGE: ${language}
MODE: ${mode}

CURRENT RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDescription || "(none provided)"}

TASK:
Rewrite / optimize the resume for this job. Keep it realistic to the original experience, but improve clarity, impact, and alignment with the role. 
Output ONLY the final resume text, no explanations or markdown.`;

        const response = await client.responses.create({
            model: "chatgpt-4o-latest",
            input: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
        });

        // Extract plain text from the responses API
        const outContent = response.output?.[0]?.content || [];
        let rewrittenText = "";

        for (const block of outContent) {
            if (block.type === "output_text" || block.type === "text") {
                rewrittenText += block.text || "";
            }
        }

        if (!rewrittenText.trim()) {
            console.error("Empty rewrittenText from OpenAI:", response);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: "AI_UNAVAILABLE",
                    details: "Empty response from OpenAI",
                }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                rewrittenText,
                jobDescription: jobDescription || null,
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
                    err && err.message ? String(err.message) : JSON.stringify(err),
            }),
        };
    }
};