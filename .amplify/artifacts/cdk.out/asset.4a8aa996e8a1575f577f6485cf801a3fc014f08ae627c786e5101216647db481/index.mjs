/** * Reads SSM environment context from a known Amplify environment variable, * fetches values from SSM and places those values in the corresponding environment variables */export const internalAmplifyFunctionResolveSsmParams = async (client) => {    const envPathObject = JSON.parse(process.env.AMPLIFY_SSM_ENV_CONFIG ?? '{}');    const paths = Object.values(envPathObject).map((paths) => paths.path);    if (paths.length === 0) {        return;    }    let actualSsmClient;    if (client) {        actualSsmClient = client;    }    else {        const ssmSdk = await import('@aws-sdk/client-ssm');        actualSsmClient = new ssmSdk.SSM();    }    const chunkArray = (array, chunkSize) => {        const chunks = [];        for (let i = 0; i < array.length; i += chunkSize) {            chunks.push(array.slice(i, i + chunkSize));        }        return chunks;    };    const resolveSecrets = async (paths) => {        const response = (await Promise.all(chunkArray(paths, 10).map(async (chunkedPaths) => await actualSsmClient.getParameters({            Names: chunkedPaths,            WithDecryption: true,        })))).reduce((accumulator, res) => {            accumulator.Parameters?.push(...(res.Parameters ?? []));            accumulator.InvalidParameters?.push(...(res.InvalidParameters ?? []));            return accumulator;        }, {            Parameters: [],            InvalidParameters: [],        });        if (response.Parameters && response.Parameters.length > 0) {            for (const parameter of response.Parameters) {                if (parameter.Name) {                    const envKey = Object.keys(envPathObject).find((key) => envPathObject[key].sharedPath === parameter.Name ||                        envPathObject[key].path === parameter.Name);                    if (envKey) {                        process.env[envKey] = parameter.Value;                    }                }            }        }        return response;    };    const response = await resolveSecrets(paths);    const sharedPaths = (response?.InvalidParameters || [])        .map((invalidParam) => Object.values(envPathObject).find((paths) => paths.path === invalidParam)?.sharedPath)        .filter((sharedParam) => !!sharedParam);     if (sharedPaths.length > 0) {        await resolveSecrets(sharedPaths);    }};await internalAmplifyFunctionResolveSsmParams();const SSM_PARAMETER_REFRESH_MS = 1000 * 60;setInterval(async () => {    try {        await internalAmplifyFunctionResolveSsmParams();    }    catch (error) {        try {                        console.debug(error);                    }        catch {                    }    }}, SSM_PARAMETER_REFRESH_MS);export {};
import{createRequire as p}from"node:module";import m from"node:path";import h from"node:url";global.require=p(import.meta.url);global.__filename=h.fileURLToPath(import.meta.url);global.__dirname=m.dirname(__filename);var l=process.env.OPENAI_API_KEY;async function O(r){if(!l)throw new Error("Missing OPENAI_API_KEY");let{resumeText:e,jobDescription:s,language:a,mode:n}=r,c=`
You are a professional r\xE9sum\xE9 writer.

GOALS:
- Rewrite the resume so it is ATS-friendly AND visually clean.
- Use clear section headings (e.g. PROFESSIONAL PROFILE, EXPERIENCE, EDUCATION, SKILLS).
- Write concise, impact-focused bullet points with metrics where possible.

STRICT FORMAT RULES:
- NO ASCII art.
- NO decorative lines made of repeated characters (no "-----", "*****", "______" etc.).
- Do NOT surround headings with asterisks or dashes.
- Use normal capitalization and spacing.
- Bullet points should use a simple bullet like "\u2022 " at the beginning of the line.
- Preserve logical paragraph and section spacing.

OUTPUT:
Return ONLY valid JSON with this shape:

{
  "templateId": "modern-clean-1",
  "content": "FINAL RESUME AS PLAIN TEXT, WITH GOOD SPACING AND BULLETS ONLY USING '\u2022 '",
  "structured": null
}

"structured" is reserved for future use; you may return null for now.
If the user language is Spanish, write the r\xE9sum\xE9 in Spanish; otherwise in English.
If mode is "federal", keep standard format (we will specialize federal later).
  `.trim(),u=`
Language: ${a||"en"}
Mode: ${n||"standard"}

Job description (optional):
${s||"(none provided)"}

Original resume:
${e}
`.trim(),t=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${l}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",messages:[{role:"system",content:c},{role:"user",content:u}],temperature:.4})});if(!t.ok){let o=await t.text();throw console.error("OpenAI error:",t.status,o),new Error(`OpenAI error ${t.status}: ${o}`)}let i=(await t.json()).choices?.[0]?.message?.content||"",d;try{d=JSON.parse(i)}catch(o){console.error("Failed to parse OpenAI JSON. Raw content:",i,o),d={templateId:"modern-clean-1",content:i,structured:null}}return d}var I=async r=>{try{if(r.requestContext?.http?.method==="OPTIONS")return{statusCode:204,headers:corsHeaders(),body:""};if(!r.body)return{statusCode:400,headers:corsHeaders(),body:JSON.stringify({error:"Missing body"})};let e;try{e=typeof r.body=="string"?JSON.parse(r.body||"{}"):r.body||{}}catch(n){return console.error("Invalid JSON body:",n),{statusCode:400,headers:corsHeaders(),body:JSON.stringify({error:"Invalid JSON body"})}}let{resumeText:s}=e;if(!s||typeof s!="string")return{statusCode:400,headers:corsHeaders(),body:JSON.stringify({error:"resumeText is required"})};let a=await O(e);return{statusCode:200,headers:corsHeaders(),body:JSON.stringify(a)}}catch(e){return console.error("Rewrite Lambda error:",e),{statusCode:500,headers:corsHeaders(),body:JSON.stringify({error:"INTERNAL_ERROR",details:String(e&&e.message?e.message:e)})}}};export{I as handler};
//# sourceMappingURL=index.mjs.map
