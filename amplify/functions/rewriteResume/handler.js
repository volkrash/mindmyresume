const https = require("https");

exports.handler = async (event) => {
    if (
        event.requestContext &&
        event.requestContext.http &&
        event.requestContext.http.method === "OPTIONS"
    ) {
        return cors(200, { ok: true });
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return cors(500, { error: "OPENAI_API_KEY not set" });
        }

        let body = {};
        if (typeof event.body === "string") {
            body = JSON.parse(event.body);
        }

        const resumeText = body.resumeText || "";
        const jobDescription = body.jobDescription || "";
        const language = body.language || "en";

        if (!resumeText.trim()) {
            return cors(400, { error: "resumeText is required" });
        }

        const systemPrompt =
            language === "es"
                ? "Eres un experto en redacción de currículums. Reescribe el currículum con formato profesional, logros y optimización ATS."
                : "You are an expert resume writer. Rewrite with professional structure, bullet points, and ATS optimization.";

        const userPrompt = `${resumeText}\n\nJob description:\n${jobDescription}`;

        const payload = JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        });

        const result = await callOpenAI(payload, apiKey);

        return cors(200, { rewrittenText: result });

    } catch (error) {
        return cors(500, { error: error.message || String(error) });
    }
};

function callOpenAI(payload, apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.openai.com",
            path: "/v1/chat/completions",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "Content-Length": Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);

                    const text =
                        json.choices &&
                        json.choices[0] &&
                        json.choices[0].message &&
                        json.choices[0].message.content
                            ? json.choices[0].message.content
                            : "No response generated";

                    resolve(text);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

function cors(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        body: JSON.stringify(body)
    };
}
