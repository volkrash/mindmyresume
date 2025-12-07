// src/components/Dashboard.tsx
import { useEffect, useState, useRef } from "react";
import { client } from "../amplifyClient";
import jsPDF from "jspdf";
import { ModernCleanTemplate } from "../templates/ModernCleanTemplate";
import mammoth from "mammoth/mammoth.browser";
import * as pdfjsLib from "pdfjs-dist";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Config via Vite env vars
const STRIPE_UNLIMITED_URL = import.meta.env.VITE_STRIPE_UNLIMITED_URL || null;
const STRIPE_CREDITS_URL = import.meta.env.VITE_STRIPE_CREDITS_URL || null;
const REWRITE_URL = import.meta.env.VITE_REWRITE_URL || null;
const SUGGESTION_URL = import.meta.env.VITE_SUGGESTION_URL || null;

// LocalStorage keys
const UNLIMITED_FLAG_KEY = "mmr_unlimited_active";
const UNLIMITED_EXPIRES_KEY = "mmr_unlimited_expires_at";
const CREDITS_KEY = "mmr_rewrite_credits";

// Plan settings
const ACCESS_DAYS = 90; // 90-day unlimited plan
const UNLIMITED_PRICE = 24.99; // $24.99
const CREDITS_PRICE = 5.99; // $5.99
const CREDITS_PER_PACK = 5; // 5 rewrites per credits pack


// Optional classic template (kept if you want to use later)
function ClassicTemplate({
                             content,
                             jobDescription,
                         }: {
    content: string;
    jobDescription?: string;
}) {
    return (
        <div
            style={{
                width: "100%",
                maxWidth: "800px",
                minHeight: "1050px",
                margin: "0 auto",
                padding: "40px 50px",
                backgroundColor: "#ffffff",
                color: "#111827",
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                fontSize: "11pt",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    marginBottom: "16px",
                    borderBottom: "2px solid #e5e7eb",
                    paddingBottom: "8px",
                }}
            >
                <h1
                    style={{
                        margin: 0,
                        fontSize: "20pt",
                        letterSpacing: "0.03em",
                    }}
                />
                {jobDescription && (
                    <p
                        style={{
                            margin: "4px 0 0 0",
                            fontSize: "9pt",
                            color: "#6b7280",
                        }}
                    >
                        {jobDescription}
                    </p>
                )}
            </div>
            <div
                style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.4,
                }}
            >
                {content}
            </div>
        </div>
    );
}

// Small helper to generate codes when admin creates new ones
const generateRandomCode = () =>
    "MMR-" + Math.random().toString(36).substring(2, 8).toUpperCase();

export default function Dashboard({
                                      lang,
                                      user,
                                      onSignOut,
                                  }: {
    lang: "en" | "es";
    user: any;
    onSignOut: () => void;
}) {
    const [resumes, setResumes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState("");

    const [hasUnlimited, setHasUnlimited] = useState(false);
    const [unlimitedExpiresAt, setUnlimitedExpiresAt] = useState<string | null>(
        null
    );
    const [rewriteCredits, setRewriteCredits] = useState(0);

    const [activeResume, setActiveResume] = useState<any | null>(null);
    const [editorContent, setEditorContent] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<"classic" | "federal">("classic");

    const isFederalTemplate = selectedTemplate === "federal";

    const [redeemCode, setRedeemCode] = useState("");
    const [isRedeeming, setIsRedeeming] = useState(false);

    // 🔐 Admin-only AccessCode viewer state
    const [accessCodes, setAccessCodes] = useState<any[]>([]);
    const [accessCodesLoading, setAccessCodesLoading] = useState(false);
    const [newCodeForm, setNewCodeForm] = useState({
        code: "",
        days: 45,
        credits: 10,
        maxUses: 1,
        expiresAt: "", // yyyy-mm-dd
    });

    // 🔍 filter for codes
    const [codesFilter, setCodesFilter] = useState<"all" | "active" | "exhausted">(
        "all"
    );

    // 🔹 Admin-only suggestions viewer state
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsFilter, setSuggestionsFilter] = useState<"all" | "dashboard" | "resume">("all");

    // 🔹 Suggestions state
    const [suggestionText, setSuggestionText] = useState("");
    const [suggestionSending, setSuggestionSending] = useState(false);
    const [suggestionSuccess, setSuggestionSuccess] = useState<string | null>(null);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);

    const previewRef = useRef<HTMLDivElement | null>(null);

    const isSpanish = lang === "es";
    const hasAnyPlan = hasUnlimited || rewriteCredits > 0;
    const canUseAI = hasUnlimited || rewriteCredits > 0;
    const loginEmail = (user?.signInDetails?.loginId || "").toLowerCase();
    const isDevUser = loginEmail === "almaldonado@gmail.com";

    const t = {
        welcome: isSpanish ? "Bienvenido" : "Welcome",
        newResumePlaceholder: isSpanish ? "Título del currículum" : "Resume title",
        createButton: isSpanish ? "Crear currículum" : "Create resume",
        noResumes: isSpanish
            ? "Aún no tienes currículums."
            : "You don't have any resumes yet.",
        expiresIn: isSpanish ? "Días hasta que expire" : "Days until expiration",
        actions: isSpanish ? "Acciones" : "Actions",
        delete: isSpanish ? "Eliminar" : "Delete",
        edit: isSpanish ? "Editar" : "Edit",
        logout: isSpanish ? "Cerrar sesión" : "Sign out",
        payTitle: isSpanish ? "Elige tu plan" : "Choose your plan",
        editorTitle: isSpanish ? "Editor de currículum" : "Resume editor",
        saveChanges: isSpanish ? "Guardar cambios" : "Save changes",
        rewritesLeft: isSpanish
            ? "Reescrituras con IA restantes"
            : "AI rewrites left",
        uploadLabel: isSpanish
            ? "Subir archivo (.txt, .docx, .pdf)"
            : "Upload resume (.txt, .docx, .pdf)",
        uploadHint: isSpanish
            ? "Puedes subir tu currículum en .txt, .docx o .pdf. Extraeremos el texto automáticamente."
            : "You can upload your resume as .txt, .docx, or .pdf. We'll extract the text automatically.",
        downloadPdf: isSpanish ? "Descargar como PDF" : "Download as PDF",
        templateLabel: isSpanish ? "Plantilla" : "Template",
        redeemLabel: isSpanish ? "Canjear código" : "Redeem code",
        redeemPlaceholder: isSpanish ? "Ingresa tu código" : "Enter your code",
        redeemButton: isSpanish ? "Canjear" : "Redeem",
        redeeming: isSpanish ? "Canjeando..." : "Redeeming...",
        redeemSuccess: isSpanish
            ? "Código canjeado correctamente."
            : "Code redeemed successfully.",
        redeemEmptyError: isSpanish
            ? "Por favor ingresa un código."
            : "Please enter a code.",
        // Admin-only
        adminCodesTitle: isSpanish
            ? "Admin · Códigos de acceso"
            : "Admin · Access codes",
        adminCodesHint: isSpanish
            ? "Solo tú ves esta sección. Administra códigos para pilotos, agencias, etc."
            : "Only you can see this section. Manage codes for pilots, agencies, etc.",
        adminCreateLabel: isSpanish ? "Crear nuevo código" : "Create new code",
        adminRefresh: isSpanish ? "Refrescar lista" : "Refresh list",
        adminFilterAll: isSpanish ? "Todos" : "All",
        adminFilterActive: isSpanish ? "Activos" : "Active",
        adminFilterExhausted: isSpanish
            ? "Agotados / expirados"
            : "Exhausted / expired",

        // Suggestions
        suggestionTitle: isSpanish
            ? "¿Cómo podemos mejorar esta página?"
            : "How can we improve this page?",
        suggestionPlaceholder: isSpanish
            ? "Cuéntanos qué te gustaría ver, mejorar o cambiar en este panel..."
            : "Tell us what you'd like to see, improve, or change on this dashboard...",
        suggestionButton: isSpanish ? "Enviar sugerencia" : "Submit suggestion",
        suggestionSending: isSpanish ? "Enviando..." : "Sending...",
        suggestionThanks: isSpanish
            ? "¡Gracias! Tu sugerencia ha sido enviada."
            : "Thank you! Your suggestion has been submitted.",
        suggestionError: isSpanish
            ? "Hubo un problema al enviar tu sugerencia."
            : "There was a problem submitting your suggestion.",
    };

    // Load resumes
    useEffect(() => {
        const fetchResumes = async () => {
            try {
                setLoading(true);
                const { data } = await client.models.Resume.list();
                setResumes(data || []);
            } catch (err) {
                console.error("Error loading resumes", err);
            } finally {
                setLoading(false);
            }
        };
        fetchResumes();
    }, []);

    // 🔐 Admin: load AccessCodes when dev user logs in
    useEffect(() => {
        if (!isDevUser) return;

        const loadAccessCodes = async () => {
            try {
                setAccessCodesLoading(true);
                const { data, errors } = await client.models.AccessCode.list({
                    limit: 200,
                });
                if (errors && errors.length) {
                    console.error("AccessCode.list errors:", errors);
                }
                setAccessCodes(data || []);
            } catch (err) {
                console.error("Error loading access codes:", err);
            } finally {
                setAccessCodesLoading(false);
            }
        };

        loadAccessCodes();
    }, [isDevUser]);

    // 🔐 Admin: load Suggestions when dev user logs in
    useEffect(() => {
        if (!isDevUser) return;

        const loadSuggestions = async () => {
            try {
                setSuggestionsLoading(true);
                const { data, errors } = await client.models.Suggestion.list({
                    limit: 200,
                });

                if (errors && errors.length) {
                    console.error("Suggestion.list errors:", errors);
                }

                // sort newest first
                const sorted = (data || []).sort((a: any, b: any) => {
                    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return tb - ta;
                });

                setSuggestions(sorted);
            } catch (err) {
                console.error("Error loading suggestions:", err);
            } finally {
                setSuggestionsLoading(false);
            }
        };

        loadSuggestions();
    }, [isDevUser]);

    // Detect payment & load plan / credits
    useEffect(() => {
        try {
            // 1) Load stored unlimited plan
            const storedUnlimited = localStorage.getItem(UNLIMITED_FLAG_KEY);
            const storedExpires = localStorage.getItem(UNLIMITED_EXPIRES_KEY);

            if (storedUnlimited === "true" && storedExpires) {
                const expTime = new Date(storedExpires).getTime();
                if (!Number.isNaN(expTime) && expTime > Date.now()) {
                    setHasUnlimited(true);
                    setUnlimitedExpiresAt(storedExpires);
                } else {
                    // expired → clear
                    localStorage.removeItem(UNLIMITED_FLAG_KEY);
                    localStorage.removeItem(UNLIMITED_EXPIRES_KEY);
                }
            }

            // 2) Load stored credits
            const storedCredits = localStorage.getItem(CREDITS_KEY);
            let currentCredits = 0;
            if (storedCredits && !Number.isNaN(parseInt(storedCredits, 10))) {
                currentCredits = parseInt(storedCredits, 10);
                setRewriteCredits(currentCredits);
            }

            // 3) Process Stripe callback (?plan=unlimited|credits or ?checkout=...)
            const params = new URLSearchParams(window.location.search);
            const which = params.get("plan") || params.get("checkout");

            if (which === "unlimited") {
                const expires = new Date();
                expires.setDate(expires.getDate() + ACCESS_DAYS);
                const iso = expires.toISOString();

                setHasUnlimited(true);
                setUnlimitedExpiresAt(iso);
                localStorage.setItem(UNLIMITED_FLAG_KEY, "true");
                localStorage.setItem(UNLIMITED_EXPIRES_KEY, iso);
            } else if (which === "credits") {
                const newCredits = currentCredits + CREDITS_PER_PACK;
                setRewriteCredits(newCredits);
                localStorage.setItem(CREDITS_KEY, String(newCredits));
            }

            // 4) Clean URL
            if (which) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, "", cleanUrl);
            }
        } catch (err) {
            console.error("Error loading plan status", err);
        }
    }, []);

    const handlePurchaseUnlimited = () => {
        if (!STRIPE_UNLIMITED_URL) {
            alert(
                isSpanish
                    ? "Falta configurar VITE_STRIPE_UNLIMITED_URL en .env.local."
                    : "VITE_STRIPE_UNLIMITED_URL is not configured in .env.local."
            );
            return;
        }
        window.location.href = STRIPE_UNLIMITED_URL;
    };

    const handlePurchaseCredits = () => {
        if (!STRIPE_CREDITS_URL) {
            alert(
                isSpanish
                    ? "Falta configurar VITE_STRIPE_CREDITS_URL en .env.local."
                    : "VITE_STRIPE_CREDITS_URL is not configured in .env.local."
            );
            return;
        }
        window.location.href = STRIPE_CREDITS_URL;
    };

    // ✅ Redeem using AccessCode query
    const handleRedeemCode = async () => {
        if (!redeemCode.trim()) {
            alert(t.redeemEmptyError);
            return;
        }

        try {
            setIsRedeeming(true);
            const code = redeemCode.trim();

            // 🔌 Call the custom query (backed by your Lambda)
            const { data, errors } = await client.queries.accessByCode({ code });

            if (errors?.length) {
                console.error("accessByCode errors:", errors);
                const raw = errors[0]?.message || "";

                let friendly = isSpanish
                    ? "Hubo un problema al canjear el código."
                    : "There was a problem redeeming the code.";

                if (raw.includes("INVALID_CODE")) {
                    friendly = isSpanish
                        ? "Este código no es válido."
                        : "This code is not valid.";
                } else if (raw.includes("CODE_EXPIRED")) {
                    friendly = isSpanish
                        ? "Este código ya expiró."
                        : "This code has expired.";
                } else if (raw.includes("CODE_EXHAUSTED")) {
                    friendly = isSpanish
                        ? "Este código ya se ha utilizado el número máximo de veces."
                        : "This code has already been used the maximum number of times.";
                } else if (raw.includes("FAILED_TO_CONSUME_CODE")) {
                    friendly = isSpanish
                        ? "No se pudo actualizar el uso del código. Inténtalo de nuevo."
                        : "Failed to consume the code. Please try again.";
                }

                alert(friendly);
                return;
            }

            if (!data) {
                alert(
                    isSpanish
                        ? "No se encontró información para este código."
                        : "No data returned for this code."
                );
                return;
            }

            const grantedDays = data.days ?? 0;
            const grantedCredits = data.credits ?? 0;

            // 🕒 Extend unlimited access from whichever is later: now or current expiry
            const now = new Date();
            const base =
                unlimitedExpiresAt &&
                new Date(unlimitedExpiresAt).getTime() > now.getTime()
                    ? new Date(unlimitedExpiresAt)
                    : now;

            base.setDate(base.getDate() + grantedDays);
            const newExpiryIso = base.toISOString();

            setHasUnlimited(true);
            setUnlimitedExpiresAt(newExpiryIso);
            localStorage.setItem(UNLIMITED_FLAG_KEY, "true");
            localStorage.setItem(UNLIMITED_EXPIRES_KEY, newExpiryIso);

            // ➕ Add the credits from the code
            const updatedCredits = rewriteCredits + grantedCredits;
            setRewriteCredits(updatedCredits);
            localStorage.setItem(CREDITS_KEY, String(updatedCredits));

            setRedeemCode("");

            const successMsg = isSpanish
                ? `Código canjeado. Acceso extendido ${grantedDays} días y ${grantedCredits} créditos añadidos.`
                : `Code redeemed. Access extended by ${grantedDays} days and ${grantedCredits} credits added.`;

            alert(successMsg);
        } catch (err: any) {
            console.error("Error redeeming code via accessByCode:", err);
            alert(
                isSpanish
                    ? "Hubo un problema al canjear el código."
                    : "There was a problem redeeming the code."
            );
        } finally {
            setIsRedeeming(false);
        }
    };

    // DEV-ONLY helpers
    const handleDevUnlimited = () => {
        if (
            window.confirm(
                isSpanish
                    ? "Simular compra del plan ilimitado de 90 días?"
                    : "Simulate purchase of the 90-day unlimited plan?"
            )
        ) {
            const expires = new Date();
            expires.setDate(expires.getDate() + ACCESS_DAYS);
            const iso = expires.toISOString();
            setHasUnlimited(true);
            setUnlimitedExpiresAt(iso);
            localStorage.setItem(UNLIMITED_FLAG_KEY, "true");
            localStorage.setItem(UNLIMITED_EXPIRES_KEY, iso);
        }
    };

    const handleDevCredits = () => {
        if (
            window.confirm(
                isSpanish
                    ? "Simular compra de 5 reescrituras?"
                    : "Simulate purchase of 5 rewrites?"
            )
        ) {
            const newCredits = rewriteCredits + CREDITS_PER_PACK;
            setRewriteCredits(newCredits);
            localStorage.setItem(CREDITS_KEY, String(newCredits));
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return;
        if (!hasAnyPlan) {
            alert(
                isSpanish
                    ? "Activa el plan ilimitado de 90 días o compra un paquete de 5 reescrituras antes de crear currículums."
                    : "Activate the 90-day unlimited plan or buy a 5-rewrite pack before creating resumes."
            );
            return;
        }

        try {
            setCreating(true);

            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setFullYear(expiresAt.getFullYear() + 2);

            const placeholderContent = isSpanish
                ? "Contenido generado del currículum (demo)."
                : "Generated resume content (demo).";

            const result = await client.models.Resume.create({
                title: title.trim(),
                language: lang,
                aiJson: JSON.stringify({ content: placeholderContent,
                template: selectedTemplate,}),
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
            });

            const created = result?.data;
            if (!created) {
                console.error("Create resume failed (full):", JSON.stringify(result));
                alert(
                    isSpanish
                        ? "Ocurrió un error al crear el currículum."
                        : "An error occurred while creating the resume."
                );
                return;
            }

            let initialContent = "";
            try {
                if (created.aiJson) {
                    const parsed = JSON.parse(created.aiJson);
                    if (typeof parsed === "string") initialContent = parsed;
                    else if (parsed && typeof parsed === "object" && "content" in parsed)
                        initialContent = (parsed as any).content || "";
                }
            } catch {
                initialContent = created.aiJson || "";
            }

            setResumes((prev) => [...prev, created]);
            setTitle("");
            setActiveResume(created);
            setEditorContent(initialContent);
        } catch (err) {
            console.error("Error creating resume", err);
            alert(
                isSpanish
                    ? "Ocurrió un error al crear el currículum."
                    : "An error occurred while creating the resume."
            );
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (
            !window.confirm(
                isSpanish ? "¿Eliminar este currículum?" : "Delete this resume?"
            )
        )
            return;

        try {
            await client.models.Resume.delete({ id });
            setResumes((prev) => prev.filter((r) => r.id !== id));
            if (activeResume && activeResume.id === id) {
                setActiveResume(null);
                setEditorContent("");
                setJobDescription("");
            }
        } catch (err) {
            console.error("Error deleting resume", err);
        }
    };

    const handleSelectResume = (resume: any) => {
        if (!resume) return;
        setActiveResume(resume);

        let content = "";
        let template: "classic" | "federal" = "classic";
        try {
            if (resume.aiJson) {
                const parsed = JSON.parse(resume.aiJson);
                if (typeof parsed === "string") content = parsed;
                else if (parsed && typeof parsed === "object") {
                    content = (parsed as any).content || "";
                    if ((parsed as any).template === "federal") {
                        template = "federal";
                    }
                }
            }
        }catch {
            content = resume.aiJson || "";
        }

        setEditorContent(content);
        setSelectedTemplate(template);
    };

    const handleSaveChanges = async () => {
        if (!activeResume) return;
        try {
            const { data: updated } = await client.models.Resume.update({
                id: activeResume.id,
                aiJson: JSON.stringify({
                    content: editorContent,
                template: selectedTemplate,
                }),
            });

            setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setActiveResume(updated);
            alert(isSpanish ? "Cambios guardados." : "Changes saved.");
        } catch (err) {
            console.error("Error updating resume", err);
            alert(
                isSpanish ? "Error al guardar los cambios." : "Error saving changes."
            );
        }
    };

    // file upload: .txt, .docx, .pdf
    const handleFileUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const resetInput = () => {
            e.target.value = "";
        };

        try {
            setUploading(true);

            const name = file.name || "";
            const ext = name.split(".").pop()?.toLowerCase();

            if (!ext) {
                alert(
                    isSpanish
                        ? "Tipo de archivo no reconocido."
                        : "Unrecognized file type."
                );
                resetInput();
                return;
            }

            // ✅ Plain text
            if (ext === "txt") {
                const text = await file.text();
                setEditorContent(text);
                resetInput();
                return;
            }

            // ✅ DOCX (Word)
            if (ext === "docx") {
                const arrayBuffer = await file.arrayBuffer();
                const { value } = await mammoth.extractRawText({ arrayBuffer });
                // value is plain text
                setEditorContent(value || "");
                resetInput();
                return;
            }

            // ✅ PDF
            if (ext === "pdf") {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                let fullText = "";

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const content = await page.getTextContent();

                    const pageText = content.items
                        .map((item: any) =>
                            typeof item.str === "string" ? item.str : ""
                        )
                        .join(" ");

                    fullText += pageText + "\n\n";
                }

                setEditorContent(fullText.trim());
                resetInput();
                return;
            }

            // optional: old .doc (binary Word) -> reject or handle later
            if (ext === "doc") {
                alert(
                    isSpanish
                        ? "Los archivos .doc antiguos no están soportados todavía. Guarda tu currículum como .docx o PDF y vuelve a subirlo."
                        : "Old .doc files are not supported yet. Please save your resume as .docx or PDF and upload again."
                );
                resetInput();
                return;
            }

            // fallback
            alert(
                isSpanish
                    ? "Tipo de archivo no soportado. Usa .txt, .docx o .pdf."
                    : "Unsupported file type. Please use .txt, .docx, or .pdf."
            );
            resetInput();
        } catch (err) {
            console.error("Error reading file", err);
            alert(
                isSpanish
                    ? "Hubo un problema leyendo el archivo."
                    : "There was a problem reading the file."
            );
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!editorContent.trim()) {
            alert(
                isSpanish
                    ? "No hay contenido para exportar. Escribe o pega tu currículum primero."
                    : "There is no content to export. Please write or paste your resume first."
            );
            return;
        }

        const allLines = editorContent.split(/\r?\n/);

        // --- Split header vs body by first blank line ---
        let splitIndex = allLines.findIndex((l) => l.trim() === "");
        if (splitIndex === -1) splitIndex = allLines.length;

        const headerLines = allLines.slice(0, splitIndex).filter((l) => l.trim() !== "");
        const bodyLines = allLines.slice(splitIndex + 1); // may be empty

        const doc = new jsPDF({
            unit: "pt",
            format: "a4",
            orientation: "portrait",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 52;
        const marginTop = 60;
        const marginBottom = 60;
        const contentWidth = pageWidth - marginX * 2;

        let y = marginTop;

        const lineHeightBody = 14;
        const lineHeightHeading = 16;
        const lineHeightName = 26;

        const ensureSpace = (neededHeight: number) => {
            if (y + neededHeight > pageHeight - marginBottom) {
                doc.addPage();
                y = marginTop;
            }
        };

        // --- Header block (name, location, contact) ---
        const nameLine = headerLines[0] || (isSpanish ? "NOMBRE APELLIDO" : "YOUR NAME");
        const locationLine = headerLines[1] || "";
        const isFederalTemplate = selectedTemplate === "federal";

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        ensureSpace(lineHeightName);
        doc.text(nameLine.trim(), marginX, y);
        y += lineHeightName;

        if (locationLine) {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            ensureSpace(lineHeightBody);
            doc.text(locationLine.trim(), marginX, y);
            y += lineHeightBody;
        }

        // Remaining header lines (phone, email, LinkedIn…) each on its own line
        if (headerLines.length > 2) {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81);

            for (let i = 2; i < headerLines.length; i++) {
                const line = headerLines[i].trim();
                if (!line) continue;
                ensureSpace(lineHeightBody);
                doc.text(line, marginX, y);
                y += lineHeightBody;
            }
        }

        // Divider
        y += 8;
        ensureSpace(10);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.8);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 18;

        // --- Helpers for body formatting ---

        const isHeadingLine = (raw: string) => {
            const text = raw.trim();
            if (!text) return false;
            // If it contains lowercase letters, it's not a heading
            if (/[a-z]/.test(text)) return false;
            // Ignore pure bullet characters
            if (/^[•\-]+$/.test(text)) return false;
            return true;
        };

        const isBulletLine = (raw: string) => {
            return raw.trim().startsWith("• ") || raw.trim().startsWith("- ");
        };

        const renderHeading = (text: string) => {
            const trimmed = text.trim();
            ensureSpace(lineHeightHeading * 2);
            // Extra space before headings
            y += 4;

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(55, 65, 81);
            doc.text(trimmed, marginX, y);
            y += lineHeightHeading;
        };

        const renderParagraph = (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) {
                // blank line → vertical spacing
                y += lineHeightBody;
                return;
            }

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(17, 24, 39);

            const wrapped = doc.splitTextToSize(trimmed, contentWidth);
            wrapped.forEach((line) => {
                ensureSpace(lineHeightBody);
                doc.text(line, marginX, y);
                y += lineHeightBody;
            });
        };

        const renderBullet = (raw: string) => {
            const trimmed = raw.trim().replace(/^[-•]\s*/, ""); // remove bullet char + space

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(17, 24, 39);

            const bulletIndent = 12; // space from bullet dot to text
            const bulletX = marginX + 2; // bullet position
            const textX = marginX + bulletIndent + 4;
            const bulletWidth = contentWidth - bulletIndent - 4;

            const wrapped = doc.splitTextToSize(trimmed, bulletWidth);

            wrapped.forEach((line, idx) => {
                ensureSpace(lineHeightBody);
                if (idx === 0) {
                    // First line: draw bullet + text
                    doc.text("•", bulletX, y);
                    doc.text(line, textX, y);
                } else {
                    // Continuation lines aligned with text
                    doc.text(line, textX, y);
                }
                y += lineHeightBody;
            });
        };

        // --- Render body lines ---
        for (let i = 0; i < bodyLines.length; i++) {
            const raw = bodyLines[i] ?? "";
            const trimmed = raw.trim();

            if (!trimmed) {
                // preserve blank line spacing between sections
                y += lineHeightBody;
                continue;
            }

            if (isHeadingLine(trimmed)) {
                renderHeading(trimmed);
                continue;
            }

            if (isBulletLine(trimmed)) {
                renderBullet(trimmed);
                continue;
            }

            // Normal paragraph (job titles, company lines, etc.)
            renderParagraph(trimmed);
        }

        const safeTitle = (activeResume?.title || "resume").replace(/[^a-z0-9\-]+/gi, "_");
        doc.save(`${safeTitle}.pdf`);
    };

    const handleRewriteWithAI = async () => {

        const mode = selectedTemplate === "federal" ? "federal" : "standard";

        if (!REWRITE_URL) {
            console.error("VITE_REWRITE_URL not configured");
            alert(
                isSpanish
                    ? "El servicio de IA no está configurado."
                    : "The AI service is not configured."
            );
            return;
        }

        if (!activeResume) {
            alert(
                isSpanish
                    ? "Selecciona un currículum de la lista primero."
                    : "Select a resume from the list first."
            );
            return;
        }

        if (!editorContent.trim()) {
            alert(
                isSpanish
                    ? "Primero escribe o pega tu currículum."
                    : "Please paste or type your resume first."
            );
            return;
        }

        if (!canUseAI) {
            alert(
                isSpanish
                    ? "Activa el plan ilimitado de 90 días o compra un paquete de 5 reescrituras antes de usar la IA."
                    : "Activate the 90-day unlimited plan or buy a 5-rewrite pack before using AI."
            );
            return;
        }

        // For credits plan, ensure there is at least 1 credit
        if (!hasUnlimited && rewriteCredits <= 0) {
            alert(
                isSpanish
                    ? "Has agotado tus reescrituras con IA."
                    : "You have used all your AI rewrites."
            );
            return;
        }

        try {
            setAiLoading(true);

            const response = await fetch(REWRITE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resumeText: editorContent,
                    jobDescription,
                    language: lang,
                    mode,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                console.error("AI response not OK", errorBody);
                const msg =
                    errorBody?.details?.error?.message ||
                    (isSpanish
                        ? "El servicio de IA no está disponible."
                        : "The AI service is currently unavailable.");
                alert(msg);
                return;
            }

            const data = await response.json();
            const rewrittenText = data.rewrittenText || "";
            setEditorContent(rewrittenText);

            const { data: updated } = await client.models.Resume.update({
                id: activeResume.id,
                aiJson: JSON.stringify({
                    content: rewrittenText,
                template: selectedTemplate,
                }),
            });

            setActiveResume(updated);
            setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

            // ✅ Decrement credit whenever there *are* credits, so you see the counter move
            if (rewriteCredits > 0) {
                const remaining = rewriteCredits - 1;
                setRewriteCredits(remaining);
                localStorage.setItem(CREDITS_KEY, String(remaining));
            }

            alert(
                isSpanish
                    ? "Tu currículum ha sido reescrito con IA."
                    : "Your resume has been rewritten with AI."
            );
        } catch (err) {
            console.error("AI call failed", err);
            alert(
                isSpanish ? "Error al llamar al servicio de IA." : "Error calling AI."
            );
        } finally {
            setAiLoading(false);
        }
    };

    // 🔐 Admin: create new access code
    const handleCreateAccessCode = async (e: React.FormEvent) => {
        e.preventDefault();

        // basic validation
        if (!newCodeForm.days || !newCodeForm.credits || !newCodeForm.maxUses) {
            alert(
                isSpanish
                    ? "Días, créditos y usos máximos son obligatorios."
                    : "Days, credits, and max uses are required."
            );
            return;
        }

        try {
            setAccessCodesLoading(true);

            const rawCode =
                newCodeForm.code.trim() ||
                Math.random().toString(36).substring(2, 10).toUpperCase();

            const input: any = {
                code: rawCode,
                days: Number(newCodeForm.days),
                credits: Number(newCodeForm.credits),
                maxUses: Number(newCodeForm.maxUses),
                // usedCount: will default to 0 from schema
            };

            if (newCodeForm.expiresAt) {
                const d = new Date(newCodeForm.expiresAt + "T00:00:00.000Z");
                input.expiresAt = d.toISOString();
            }

            console.log("Creating AccessCode with input:", input);

            const result = await (client as any).models.AccessCode.create(input);
            console.log("AccessCode create result:", result);

            const created = (result as any)?.data || result;

            if (!created || (result as any)?.errors?.length) {
                console.error("AccessCode create errors:", (result as any)?.errors);
                alert(
                    isSpanish
                        ? "Error al crear el código. Revisa la consola."
                        : "Error creating code. Check the console."
                );
                return;
            }

            // Update table immediately
            setAccessCodes((prev) => [created, ...prev]);

            // Reset form
            setNewCodeForm({
                code: "",
                days: 45,
                credits: 10,
                maxUses: 1,
                expiresAt: "",
            });

            alert(
                isSpanish
                    ? `Código creado: ${created.code}`
                    : `Code created: ${created.code}`
            );
        } catch (err) {
            console.error("Unhandled error creating AccessCode:", err);
            alert(
                isSpanish
                    ? "Hubo un error inesperado al crear el código."
                    : "There was an unexpected error creating the code."
            );
        } finally {
            setAccessCodesLoading(false);
        }
    };

    // 🔐 Admin: refresh list
    const handleRefreshAccessCodes = async () => {
        if (!isDevUser) return;
        try {
            setAccessCodesLoading(true);
            const { data, errors } = await client.models.AccessCode.list({
                limit: 200,
            });
            if (errors && errors.length) {
                console.error("AccessCode.list errors:", errors);
            }
            setAccessCodes(data || []);
        } catch (err) {
            console.error("Error refreshing access codes:", err);
        } finally {
            setAccessCodesLoading(false);
        }
    };

    // 🔹 Submit suggestion
    const handleSubmitSuggestion = async () => {
        if (!suggestionText.trim()) return;

        try {
            setSuggestionSending(true);
            setSuggestionError(null);
            setSuggestionSuccess(null);

            const { data, errors } = await client.models.Suggestion.create({
                message: suggestionText.trim(),
                page: "dashboard",                 // or "resume-editor", etc.
                userEmail: loginEmail,
                createdAt: new Date().toISOString()
            });

            if (errors?.length || !data) {
                console.error("Suggestion.create errors:", errors);
                setSuggestionError(
                    isSpanish
                        ? "Hubo un problema al enviar tu sugerencia."
                        : "There was a problem submitting your suggestion."
                );
                return;
            }

            // clear input
            setSuggestionText("");
            setSuggestionSuccess(
                isSpanish
                    ? "¡Gracias! Tu sugerencia ha sido enviada."
                    : "Thank you! Your suggestion has been submitted."
            );

            // ✅ update local admin dashboard state if you're logged in as dev
            if (isDevUser) {
                setSuggestions((prev) => [data, ...prev]);
            }
        } catch (err) {
            console.error("Error creating suggestion:", err);
            setSuggestionError(
                isSpanish
                    ? "Hubo un problema al enviar tu sugerencia."
                    : "There was a problem submitting your suggestion."
            );
        } finally {
            setSuggestionSending(false);
        }
    };

    const now = Date.now();

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100%",
                backgroundColor: "#020617",
                color: "white",
                display: "flex",
                justifyContent: "center",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "1000px",
                    padding: "32px 24px 48px",
                    margin: "0 auto",
                    boxSizing: "border-box",
                }}
            >
                {/* HEADER */}
                <header
                    style={{
                        marginBottom: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "999px",
                                background:
                                    "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                            }}
                        />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "18px" }}>
                                MindMyResume
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.8 }}>
                                {isSpanish
                                    ? "Tu currículum. Reimaginado."
                                    : "Your resume. Reimagined."}
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: "right", fontSize: "12px" }}>
                        <div style={{ opacity: 0.7 }}>
                            {t.welcome}, {user?.signInDetails?.loginId}
                        </div>

                        <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>
                            {t.rewritesLeft}: {rewriteCredits}
                        </div>

                        {/* ⭐ Redeem code mini form */}
                        <div
                            style={{
                                marginTop: "6px",
                                display: "flex",
                                gap: "4px",
                                justifyContent: "flex-end",
                                alignItems: "center",
                            }}
                        >
                            <input
                                type="text"
                                value={redeemCode}
                                onChange={(e) => setRedeemCode(e.target.value)}
                                placeholder={t.redeemPlaceholder}
                                style={{
                                    maxWidth: "140px",
                                    padding: "4px 8px",
                                    borderRadius: "999px",
                                    border: "1px solid #1e293b",
                                    backgroundColor: "#020617",
                                    color: "white",
                                    fontSize: "11px",
                                }}
                            />
                            <button
                                onClick={handleRedeemCode}
                                disabled={isRedeeming}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: "999px",
                                    border: "none",
                                    backgroundColor: "#22c55e",
                                    color: "#022c22",
                                    cursor: isRedeeming ? "wait" : "pointer",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    opacity: isRedeeming ? 0.7 : 1,
                                }}
                            >
                                {isRedeeming ? t.redeeming : t.redeemButton}
                            </button>
                        </div>

                        <button
                            onClick={onSignOut}
                            style={{
                                marginTop: "8px",
                                backgroundColor: "#ef4444",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "12px",
                            }}
                        >
                            {t.logout}
                        </button>
                    </div>
                </header>

                {/* PAYMENT GATE */}
                {!hasAnyPlan && (
                    <section
                        style={{
                            backgroundColor: "#0f172a",
                            borderRadius: "16px",
                            padding: "16px",
                            marginBottom: "16px",
                            border: "1px solid #22c55e55",
                        }}
                    >
                        <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
                            {t.payTitle}
                        </h2>
                        <p
                            style={{
                                margin: "0 0 12px 0",
                                fontSize: "14px",
                                opacity: 0.9,
                            }}
                        >
                            {isSpanish
                                ? "Puedes activar acceso ilimitado de 90 días o comprar un paquete pequeño de reescrituras con IA."
                                : "Activate a 90-day unlimited plan or grab a small pack of AI rewrites."}
                        </p>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
                                gap: "12px",
                            }}
                        >
                            {/* Unlimited plan card */}
                            <div
                                style={{
                                    borderRadius: "14px",
                                    padding: "12px",
                                    background:
                                        "radial-gradient(circle at top, #1f2937 0, #020617 55%, #020617 100%)",
                                    border: "1px solid rgba(148,163,184,0.4)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 6,
                                    }}
                                >
                                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                                        {isSpanish
                                            ? "Plan ilimitado 90 días"
                                            : "90-day unlimited plan"}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            padding: "2px 8px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(34,197,94,0.6)",
                                            color: "#bbf7d0",
                                        }}
                                    >
                                        ${UNLIMITED_PRICE.toFixed(2)}
                                    </div>
                                </div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 12,
                                        opacity: 0.85,
                                    }}
                                >
                                    {isSpanish
                                        ? "Reescrituras ilimitadas con IA y creación de currículums durante 90 días."
                                        : "Unlimited AI rewrites and resume creation for 90 days."}
                                </p>
                                <button
                                    type="button"
                                    onClick={handlePurchaseUnlimited}
                                    style={{
                                        marginTop: 8,
                                        padding: "6px 12px",
                                        borderRadius: "999px",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background:
                                            "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                                        color: "#020617",
                                    }}
                                >
                                    {isSpanish
                                        ? "Activar plan de 90 días"
                                        : "Activate 90-day plan"}
                                </button>
                            </div>

                            {/* Credits plan card */}
                            <div
                                style={{
                                    borderRadius: "14px",
                                    padding: "12px",
                                    backgroundColor: "#020617",
                                    border: "1px solid #1f2937",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 6,
                                    }}
                                >
                                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                                        {isSpanish
                                            ? "Paquete de 5 reescrituras"
                                            : "5-rewrite pack"}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            padding: "2px 8px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(148,163,184,0.7)",
                                            color: "#e5e7eb",
                                        }}
                                    >
                                        ${CREDITS_PRICE.toFixed(2)}
                                    </div>
                                </div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 12,
                                        opacity: 0.85,
                                    }}
                                >
                                    {isSpanish
                                        ? "Obtén 5 reescrituras con IA que no expiran hasta que las uses."
                                        : "Get 5 AI rewrites that never expire until you use them."}
                                </p>
                                <button
                                    type="button"
                                    onClick={handlePurchaseCredits}
                                    style={{
                                        marginTop: 8,
                                        padding: "6px 12px",
                                        borderRadius: "999px",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        backgroundColor: "#111827",
                                        color: "white",
                                    }}
                                >
                                    {isSpanish ? "Comprar 5 reescrituras" : "Buy 5 rewrites"}
                                </button>
                            </div>
                        </div>

                        {isDevUser && (
                            <>
                                {/* DEV ONLY (visible only to almaldonado@gmail.com) */}
                                <p
                                    style={{
                                        marginTop: 10,
                                        fontSize: 10,
                                        opacity: 0.6,
                                    }}
                                >
                                    {isSpanish
                                        ? "DEV: usa estos botones para simular compras."
                                        : "DEV: use these buttons to simulate purchases."}
                                </p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button
                                        type="button"
                                        onClick={handleDevUnlimited}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: "999px",
                                            border: "none",
                                            fontSize: 10,
                                            cursor: "pointer",
                                            backgroundColor: "#f97316",
                                            color: "#020617",
                                        }}
                                    >
                                        DEV: 90-day unlimited
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDevCredits}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: "999px",
                                            border: "none",
                                            fontSize: 10,
                                            cursor: "pointer",
                                            backgroundColor: "#fb7185",
                                            color: "#020617",
                                        }}
                                    >
                                        DEV: +5 rewrites
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                )}

                {/* 🔐 ADMIN ACCESS CODE VIEWER */}
                {isDevUser && (
                    <section
                        style={{
                            backgroundColor: "#0f172a",
                            borderRadius: "16px",
                            padding: "16px",
                            marginBottom: "24px",
                            border: "1px dashed red",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "flex-start",
                            }}
                        >
                            <div>
                                <h2 style={{ margin: 0, fontSize: 16 }}>
                                    {t.adminCodesTitle}
                                </h2>
                                <p
                                    style={{
                                        margin: "4px 0 8px 0",
                                        fontSize: 11,
                                        opacity: 0.7,
                                    }}
                                >
                                    {t.adminCodesHint}
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {/* Filter controls */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 4,
                                        padding: "2px",
                                        borderRadius: 999,
                                        backgroundColor: "#020617",
                                        border: "1px solid #1f2937",
                                        fontSize: 11,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setCodesFilter("all")}
                                        style={{
                                            padding: "3px 8px",
                                            borderRadius: 999,
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor:
                                                codesFilter === "all" ? "#1f2937" : "transparent",
                                            color: "#e5e7eb",
                                        }}
                                    >
                                        {t.adminFilterAll}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCodesFilter("active")}
                                        style={{
                                            padding: "3px 8px",
                                            borderRadius: 999,
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor:
                                                codesFilter === "active" ? "#16a34a" : "transparent",
                                            color: codesFilter === "active" ? "#022c22" : "#bbf7d0",
                                        }}
                                    >
                                        {t.adminFilterActive}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCodesFilter("exhausted")}
                                        style={{
                                            padding: "3px 8px",
                                            borderRadius: 999,
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor:
                                                codesFilter === "exhausted" ? "#7f1d1d" : "transparent",
                                            color:
                                                codesFilter === "exhausted" ? "#fee2e2" : "#fecaca",
                                        }}
                                    >
                                        {t.adminFilterExhausted}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRefreshAccessCodes}
                                    disabled={accessCodesLoading}
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: "999px",
                                        border: "1px solid #1f2937",
                                        backgroundColor: "#020617",
                                        color: "#e5e7eb",
                                        fontSize: 11,
                                        cursor: accessCodesLoading ? "wait" : "pointer",
                                    }}
                                >
                                    {accessCodesLoading ? "…" : t.adminRefresh}
                                </button>
                            </div>
                        </div>

                        {/* Create new code */}
                        <form
                            onSubmit={handleCreateAccessCode}
                            style={{
                                marginTop: 8,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                alignItems: "flex-end",
                                fontSize: 11,
                            }}
                        >
                            <div style={{ minWidth: 120 }}>
                                <label style={{ display: "block", marginBottom: 2 }}>Code</label>
                                <input
                                    type="text"
                                    value={newCodeForm.code}
                                    onChange={(e) =>
                                        setNewCodeForm((prev) => ({
                                            ...prev,
                                            code: e.target.value,
                                        }))
                                    }
                                    placeholder="Auto if blank"
                                    style={{
                                        width: "100%",
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        border: "1px solid #1f2937",
                                        backgroundColor: "#020617",
                                        color: "white",
                                    }}
                                />
                            </div>
                            <div style={{ width: 80 }}>
                                <label style={{ display: "block", marginBottom: 2 }}>Days</label>
                                <input
                                    type="number"
                                    value={newCodeForm.days}
                                    onChange={(e) =>
                                        setNewCodeForm((prev) => ({
                                            ...prev,
                                            days: Number(e.target.value),
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        border: "1px solid #1f2937",
                                        backgroundColor: "#020617",
                                        color: "white",
                                    }}
                                />
                            </div>
                            <div style={{ width: 80 }}>
                                <label style={{ display: "block", marginBottom: 2 }}>
                                    Credits
                                </label>
                                <input
                                    type="number"
                                    value={newCodeForm.credits}
                                    onChange={(e) =>
                                        setNewCodeForm((prev) => ({
                                            ...prev,
                                            credits: Number(e.target.value),
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        border: "1px solid #1f2937",
                                        backgroundColor: "#020617",
                                        color: "white",
                                    }}
                                />
                            </div>
                            <div style={{ width: 80 }}>
                                <label style={{ display: "block", marginBottom: 2 }}>
                                    Max uses
                                </label>
                                <input
                                    type="number"
                                    value={newCodeForm.maxUses}
                                    onChange={(e) =>
                                        setNewCodeForm((prev) => ({
                                            ...prev,
                                            maxUses: Number(e.target.value),
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        border: "1px solid #1f2937",
                                        backgroundColor: "#020617",
                                        color: "white",
                                    }}
                                />
                            </div>
                            <div style={{ minWidth: 150 }}>
                                <label style={{ display: "block", marginBottom: 2 }}>
                                    Expires (optional)
                                </label>
                                <input
                                    type="date"
                                    value={newCodeForm.expiresAt}
                                    onChange={(e) =>
                                        setNewCodeForm((prev) => ({
                                            ...prev,
                                            expiresAt: e.target.value,
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        border: "1px solid #1f2937",
                                        backgroundColor: "#020617",
                                        color: "white",
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 999,
                                    border: "none",
                                    backgroundColor: "#22c55e",
                                    color: "#022c22",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {t.adminCreateLabel}
                            </button>
                        </form>

                        {/* Codes table */}
                        <div style={{ marginTop: 12, maxHeight: 260, overflow: "auto" }}>
                            {accessCodesLoading && accessCodes.length === 0 ? (
                                <p style={{ fontSize: 12, opacity: 0.8 }}>
                                    {isSpanish ? "Cargando códigos..." : "Loading codes..."}
                                </p>
                            ) : accessCodes.length === 0 ? (
                                <p style={{ fontSize: 12, opacity: 0.8 }}>
                                    {isSpanish ? "No hay códigos aún." : "No access codes yet."}
                                </p>
                            ) : (
                                (() => {
                                    const filteredCodes = accessCodes.filter((ac) => {
                                        const remaining =
                                            typeof ac.maxUses === "number" &&
                                            typeof ac.usedCount === "number"
                                                ? ac.maxUses - ac.usedCount
                                                : null;
                                        const isExpired = ac.expiresAt
                                            ? new Date(ac.expiresAt).getTime() < Date.now()
                                            : false;
                                        const isExhausted =
                                            remaining !== null ? remaining <= 0 : false;
                                        const isActive = !isExpired && !isExhausted;

                                        if (codesFilter === "active") return isActive;
                                        if (codesFilter === "exhausted")
                                            return isExhausted || isExpired;
                                        return true; // "all"
                                    });

                                    if (filteredCodes.length === 0) {
                                        return (
                                            <p style={{ fontSize: 12, opacity: 0.8 }}>
                                                {isSpanish
                                                    ? "No hay códigos con este filtro."
                                                    : "No codes match this filter."}
                                            </p>
                                        );
                                    }

                                    const handleCopy = async (code: string) => {
                                        try {
                                            if (navigator.clipboard?.writeText) {
                                                await navigator.clipboard.writeText(code);
                                            } else {
                                                // fallback
                                                window.prompt(
                                                    isSpanish ? "Copia el código:" : "Copy this code:",
                                                    code
                                                );
                                            }
                                        } catch (err) {
                                            console.error("Clipboard error:", err);
                                            window.prompt(
                                                isSpanish ? "Copia el código:" : "Copy this code:",
                                                code
                                            );
                                        }
                                    };

                                    return (
                                        <table
                                            style={{
                                                width: "100%",
                                                borderCollapse: "collapse",
                                                fontSize: 11,
                                            }}
                                        >
                                            <thead>
                                            <tr
                                                style={{
                                                    borderBottom: "1px solid #1f2937",
                                                    textAlign: "left",
                                                }}
                                            >
                                                <th style={{ padding: "4px 6px" }}>Code</th>
                                                <th style={{ padding: "4px 6px" }}>Days</th>
                                                <th style={{ padding: "4px 6px" }}>Credits</th>
                                                <th style={{ padding: "4px 6px" }}>Used / Max</th>
                                                <th style={{ padding: "4px 6px" }}>Remaining</th>
                                                <th style={{ padding: "4px 6px" }}>Expires</th>
                                                <th style={{ padding: "4px 6px" }}></th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {filteredCodes.map((ac) => {
                                                const remaining =
                                                    typeof ac.maxUses === "number" &&
                                                    typeof ac.usedCount === "number"
                                                        ? ac.maxUses - ac.usedCount
                                                        : "-";
                                                const expired = ac.expiresAt
                                                    ? new Date(ac.expiresAt).getTime() < Date.now()
                                                    : false;
                                                const exhausted =
                                                    typeof ac.maxUses === "number" &&
                                                    typeof ac.usedCount === "number"
                                                        ? ac.usedCount >= ac.maxUses
                                                        : false;

                                                return (
                                                    <tr
                                                        key={ac.id}
                                                        style={{
                                                            borderBottom: "1px solid #1f2937",
                                                            opacity: expired || exhausted ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <td style={{ padding: "4px 6px" }}>{ac.code}</td>
                                                        <td style={{ padding: "4px 6px" }}>{ac.days}</td>
                                                        <td style={{ padding: "4px 6px" }}>
                                                            {ac.credits}
                                                        </td>
                                                        <td style={{ padding: "4px 6px" }}>
                                                            {ac.usedCount}/{ac.maxUses}
                                                        </td>
                                                        <td style={{ padding: "4px 6px" }}>
                                                            {remaining}
                                                        </td>
                                                        <td style={{ padding: "4px 6px" }}>
                                                            {ac.expiresAt
                                                                ? new Date(
                                                                    ac.expiresAt
                                                                ).toLocaleDateString()
                                                                : "—"}
                                                        </td>
                                                        <td style={{ padding: "4px 6px" }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(ac.code)}
                                                                style={{
                                                                    padding: "3px 8px",
                                                                    borderRadius: 999,
                                                                    border: "1px solid #1f2937",
                                                                    backgroundColor: "#020617",
                                                                    color: "#e5e7eb",
                                                                    fontSize: 10,
                                                                    cursor: "pointer",
                                                                }}
                                                            >
                                                                {isSpanish ? "Copiar" : "Copy"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    );
                                })()
                            )}
                        </div>
                    </section>
                )}

                {/* 🔐 ADMIN SUGGESTIONS DASHBOARD */}
                {isDevUser && (
                    <section
                        style={{
                            backgroundColor: "#0f172a",
                            borderRadius: "16px",
                            padding: "16px",
                            marginBottom: "24px",
                            border: "1px solid #1f2937",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <h2 style={{ margin: 0, fontSize: 16 }}>
                                    {isSpanish ? "Panel de sugerencias" : "Suggestions dashboard"}
                                </h2>
                                <p
                                    style={{
                                        margin: "4px 0 8px 0",
                                        fontSize: 11,
                                        opacity: 0.7,
                                    }}
                                >
                                    {isSpanish
                                        ? "Solo tú puedes ver este panel. Aquí se muestran todas las sugerencias enviadas desde MindMyResume."
                                        : "Only you can see this panel. All suggestions submitted from MindMyResume appear here."}
                                </p>
                            </div>

                            {/* Simple filter by page */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 4,
                                    padding: "2px",
                                    borderRadius: 999,
                                    backgroundColor: "#020617",
                                    border: "1px solid #1f2937",
                                    fontSize: 11,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSuggestionsFilter("all")}
                                    style={{
                                        padding: "3px 8px",
                                        borderRadius: 999,
                                        border: "none",
                                        cursor: "pointer",
                                        backgroundColor:
                                            suggestionsFilter === "all" ? "#1f2937" : "transparent",
                                        color: "#e5e7eb",
                                    }}
                                >
                                    {isSpanish ? "Todas" : "All"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSuggestionsFilter("dashboard")}
                                    style={{
                                        padding: "3px 8px",
                                        borderRadius: 999,
                                        border: "none",
                                        cursor: "pointer",
                                        backgroundColor:
                                            suggestionsFilter === "dashboard" ? "#16a34a" : "transparent",
                                        color:
                                            suggestionsFilter === "dashboard" ? "#022c22" : "#bbf7d0",
                                    }}
                                >
                                    {isSpanish ? "Dashboard" : "Dashboard"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSuggestionsFilter("resume")}
                                    style={{
                                        padding: "3px 8px",
                                        borderRadius: 999,
                                        border: "none",
                                        cursor: "pointer",
                                        backgroundColor:
                                            suggestionsFilter === "resume" ? "#7c2d12" : "transparent",
                                        color:
                                            suggestionsFilter === "resume" ? "#ffedd5" : "#fed7aa",
                                    }}
                                >
                                    {isSpanish ? "Editor" : "Resume editor"}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: 12, maxHeight: 260, overflow: "auto" }}>
                            {suggestionsLoading && suggestions.length === 0 ? (
                                <p style={{ fontSize: 12, opacity: 0.8 }}>
                                    {isSpanish ? "Cargando sugerencias..." : "Loading suggestions..."}
                                </p>
                            ) : suggestions.length === 0 ? (
                                <p style={{ fontSize: 12, opacity: 0.8 }}>
                                    {isSpanish ? "Aún no hay sugerencias." : "No suggestions yet."}
                                </p>
                            ) : (
                                (() => {
                                    const filtered = suggestions.filter((s: any) => {
                                        if (suggestionsFilter === "all") return true;
                                        if (suggestionsFilter === "dashboard") return s.page === "dashboard";
                                        if (suggestionsFilter === "resume")
                                            return s.page === "resume" || s.page === "resume-editor";
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <p style={{ fontSize: 12, opacity: 0.8 }}>
                                                {isSpanish
                                                    ? "No hay sugerencias con este filtro."
                                                    : "No suggestions match this filter."}
                                            </p>
                                        );
                                    }

                                    return (
                                        <table
                                            style={{
                                                width: "100%",
                                                borderCollapse: "collapse",
                                                fontSize: 11,
                                            }}
                                        >
                                            <thead>
                                            <tr
                                                style={{
                                                    borderBottom: "1px solid #1f2937",
                                                    textAlign: "left",
                                                }}
                                            >
                                                <th style={{ padding: "4px 6px" }}>
                                                    {isSpanish ? "Fecha" : "Date"}
                                                </th>
                                                <th style={{ padding: "4px 6px" }}>Page</th>
                                                <th style={{ padding: "4px 6px" }}>
                                                    {isSpanish ? "Usuario" : "User"}
                                                </th>
                                                <th style={{ padding: "4px 6px" }}>
                                                    {isSpanish ? "Mensaje" : "Message"}
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {filtered.map((s: any) => (
                                                <tr
                                                    key={s.id}
                                                    style={{
                                                        borderBottom: "1px solid #1f2937",
                                                    }}
                                                >
                                                    <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                                                        {s.createdAt
                                                            ? new Date(s.createdAt).toLocaleString()
                                                            : "—"}
                                                    </td>
                                                    <td style={{ padding: "4px 6px" }}>{s.page || "—"}</td>
                                                    <td style={{ padding: "4px 6px" }}>
                                                        {s.userEmail || "—"}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "4px 6px",
                                                            maxWidth: 400,
                                                            whiteSpace: "pre-wrap",
                                                        }}
                                                    >
                                                        {s.message}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    );
                                })()
                            )}
                        </div>
                    </section>
                )}

                {/* MAIN CONTENT: TOP ROW + EDITOR BELOW */}
                <main
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                        marginTop: "40px",
                    }}
                >
                    {/* TOP ROW: CREATE + LIST */}
                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                            alignItems: "stretch",
                        }}
                    >
                        {/* Create */}
                        <section
                            style={{
                                flex: 1,
                                backgroundColor: "#0f172a",
                                borderRadius: "16px",
                                padding: "16px",
                            }}
                        >
                            <h2 style={{ marginTop: 0, fontSize: "16px" }}>
                                {isSpanish
                                    ? "Crear un nuevo currículum"
                                    : "Create a new resume"}
                            </h2>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    type="text"
                                    placeholder={t.newResumePlaceholder}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        border: "1px solid #1e293b",
                                        backgroundColor: "#020617",
                                        color: "white",
                                        fontSize: "13px",
                                    }}
                                />

                                <button
                                    disabled={creating}
                                    onClick={handleCreate}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "999px",
                                        border: "none",
                                        backgroundColor: "#22c55e",
                                        color: "#022c22",
                                        fontWeight: 600,
                                        fontSize: "13px",
                                        cursor: creating ? "wait" : "pointer",
                                        opacity: hasAnyPlan ? 1 : 0.6,
                                    }}
                                >
                                    {creating
                                        ? isSpanish
                                            ? "Creando..."
                                            : "Creating..."
                                        : t.createButton}
                                </button>
                            </div>
                            {!hasAnyPlan && (
                                <p
                                    style={{
                                        marginTop: "8px",
                                        fontSize: "11px",
                                        color: "#f97316",
                                    }}
                                >
                                    {isSpanish
                                        ? "Activa un plan para habilitar la creación."
                                        : "Activate a plan to enable resume creation."}
                                </p>
                            )}
                        </section>

                        {/* Your resumes */}
                        <section
                            style={{
                                flex: 1.1,
                                backgroundColor: "#0f172a",
                                borderRadius: "16px",
                                padding: "16px",
                            }}
                        >
                            <h2 style={{ marginTop: 0, fontSize: "16px" }}>
                                {isSpanish ? "Tus currículums" : "Your resumes"}
                            </h2>

                            {loading ? (
                                <p>{isSpanish ? "Cargando..." : "Loading..."}</p>
                            ) : resumes.length === 0 ? (
                                <p style={{ opacity: 0.8, fontSize: "13px" }}>{t.noResumes}</p>
                            ) : (
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        fontSize: "13px",
                                    }}
                                >
                                    <thead>
                                    <tr
                                        style={{
                                            borderBottom: "1px solid #1e293b",
                                            textAlign: "left",
                                        }}
                                    >
                                        <th style={{ padding: "6px" }}>Title</th>
                                        <th style={{ padding: "6px" }}>Language</th>
                                        <th style={{ padding: "6px" }}>{t.expiresIn}</th>
                                        <th style={{ padding: "6px" }}>{t.actions}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {resumes.filter(Boolean).map((r) => {
                                        const expiresMs = r.expiresAt
                                            ? new Date(r.expiresAt).getTime()
                                            : 0;
                                        const daysLeft =
                                            expiresMs <= now
                                                ? 0
                                                : Math.floor(
                                                    (expiresMs - now) / (1000 * 60 * 60 * 24)
                                                );
                                        const isActive =
                                            activeResume && activeResume.id === r.id;

                                        return (
                                            <tr
                                                key={r.id}
                                                style={{
                                                    borderBottom: "1px solid #1e293b",
                                                    backgroundColor: isActive
                                                        ? "#020617"
                                                        : "transparent",
                                                }}
                                            >
                                                <td style={{ padding: "6px" }}>{r.title}</td>
                                                <td
                                                    style={{
                                                        padding: "6px",
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    {r.language}
                                                </td>
                                                <td style={{ padding: "6px" }}>
                                                    {daysLeft === 0
                                                        ? isSpanish
                                                            ? "Expirado"
                                                            : "Expired"
                                                        : daysLeft}
                                                </td>
                                                <td style={{ padding: "6px" }}>
                                                    <button
                                                        onClick={() => handleSelectResume(r)}
                                                        style={{
                                                            marginRight: "6px",
                                                            padding: "4px 8px",
                                                            borderRadius: "999px",
                                                            border: "none",
                                                            fontSize: "11px",
                                                            cursor: "pointer",
                                                            backgroundColor: "#22c55e",
                                                            color: "#022c22",
                                                        }}
                                                    >
                                                        {t.edit}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(r.id)}
                                                        style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "999px",
                                                            border: "none",
                                                            fontSize: "11px",
                                                            cursor: "pointer",
                                                            backgroundColor: "#dc2626",
                                                            color: "white",
                                                        }}
                                                    >
                                                        {t.delete}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </div>

                    {/* FULL-WIDTH EDITOR */}
                    <section
                        style={{
                            backgroundColor: "#0f172a",
                            borderRadius: "16px",
                            padding: "16px 16px 20px",
                            display: "flex",
                            flexDirection: "column",
                            minHeight: "420px",
                            minWidth: "620px",
                        }}
                    >
                        <h2 style={{ marginTop: 0, fontSize: "16px" }}>{t.editorTitle}</h2>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px",
                                gap: "8px",
                                fontSize: "12px",
                            }}
                        >
                            <div>
                                <span style={{ opacity: 0.85 }}>{t.templateLabel}: </span>
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                    style={{
                                        backgroundColor: "#020617",
                                        color: "white",
                                        borderRadius: "999px",
                                        border: "1px solid #1e293b",
                                        padding: "4px 10px",
                                        fontSize: "12px",
                                    }}
                                >
                                    <option value="classic">
                                        {isSpanish ? "Clásica" : "Classic"}
                                    </option>
                                    <option value="federal">
                                        {isSpanish ? "Federal (USAJOBS)" : "Federal (USAJOBS"}
                                    </option>
                                    {/* Add more templates later */}
                                </select>
                            </div>
                        </div>

                        {activeResume ? (
                            <>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        opacity: 0.8,
                                        marginTop: 0,
                                        marginBottom: "6px",
                                    }}
                                >
                                    {activeResume.title}
                                </p>

                                {/* Job description */}
                                <label
                                    style={{
                                        fontSize: "12px",
                                        opacity: 0.85,
                                        display: "block",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {isSpanish
                                        ? "Descripción del puesto (opcional)"
                                        : "Job description (optional)"}
                                </label>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder={
                                        isSpanish
                                            ? "Pega aquí la descripción del puesto al que estás aplicando..."
                                            : "Paste the job description for the role you're targeting..."
                                    }
                                    style={{
                                        width: "100%",
                                        minHeight: "80px",
                                        resize: "vertical",
                                        padding: "6px 8px",
                                        borderRadius: "8px",
                                        border: "1px solid #1e293b",
                                        backgroundColor: "#020617",
                                        color: "white",
                                        fontSize: "12px",
                                        marginBottom: "8px",
                                    }}
                                />

                                {/* Resume content */}
                                <label
                                    style={{
                                        fontSize: "12px",
                                        opacity: 0.85,
                                        display: "block",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {isSpanish ? "Contenido del currículum" : "Resume content"}
                                </label>
                                <textarea
                                    value={editorContent}
                                    onChange={(e) => setEditorContent(e.target.value)}
                                    style={{
                                        flex: 1,
                                        width: "100%",
                                        minHeight: "220px",
                                        resize: "vertical",
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: "1px solid #1e293b",
                                        backgroundColor: "#020617",
                                        color: "white",
                                        fontSize: "13px",
                                        fontFamily: "monospace",
                                        marginBottom: "10px",
                                    }}
                                />

                                {/* Live preview */}
                                <div
                                    ref={previewRef}
                                    style={{
                                        marginTop: "12px",
                                        marginBottom: "10px",
                                        padding: "8px",
                                        background:
                                            "radial-gradient(circle at top left, #1f2937 0, #020617 45%, #020617 100%)",
                                        borderRadius: "12px",
                                        border: "1px solid #1e293b",
                                        overflow: "auto",
                                        maxHeight: "460px",
                                    }}
                                >
                                    <ModernCleanTemplate
                                        content={editorContent}
                                        jobDescription={jobDescription}
                                    />
                                </div>

                                {/* Bottom controls */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                        marginTop: "6px",
                                    }}
                                >
                                    {/* Left: upload + PDF */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 4,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <label
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: "999px",
                                                    border: "1px solid #1e293b",
                                                    backgroundColor: "#020617",
                                                    fontSize: "11px",
                                                    cursor: uploading ? "wait" : "pointer",
                                                    opacity: uploading ? 0.6 : 1,
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    accept=".txt,.doc,.docx,.pdf"
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                    style={{ display: "none" }}
                                                />
                                                {uploading
                                                    ? isSpanish
                                                        ? "Subiendo..."
                                                        : "Uploading..."
                                                    : t.uploadLabel}
                                            </label>

                                            <button
                                                type="button"
                                                onClick={handleDownloadPdf}
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: "999px",
                                                    border: "1px solid #1e293b",
                                                    backgroundColor: "#020617",
                                                    color: "white",
                                                    fontSize: "11px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {t.downloadPdf}
                                            </button>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                opacity: 0.65,
                                                maxWidth: "320px",
                                            }}
                                        >
                      {t.uploadHint}
                    </span>
                                    </div>

                                    {/* Right: AI + Save */}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            justifyContent: "flex-end",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <button
                                            onClick={handleRewriteWithAI}
                                            disabled={aiLoading || !canUseAI}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: "999px",
                                                border: "none",
                                                cursor: aiLoading
                                                    ? "wait"
                                                    : canUseAI
                                                        ? "pointer"
                                                        : "not-allowed",
                                                backgroundColor: canUseAI ? "#6366f1" : "#4b5563",
                                                color: "white",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                opacity: aiLoading ? 0.7 : 1,
                                            }}
                                        >
                                            {aiLoading
                                                ? isSpanish
                                                    ? "Reescribiendo..."
                                                    : "Rewriting..."
                                                : isSpanish
                                                    ? "Reescribir con IA"
                                                    : "Rewrite with AI"}
                                        </button>

                                        <button
                                            onClick={handleSaveChanges}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: "999px",
                                                border: "none",
                                                cursor: "pointer",
                                                backgroundColor: "#22c55e",
                                                color: "#022c22",
                                                fontWeight: 600,
                                                fontSize: "13px",
                                            }}
                                        >
                                            {t.saveChanges}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p style={{ fontSize: "13px", opacity: 0.8 }}>
                                {isSpanish
                                    ? "Selecciona un currículum de la lista para editarlo."
                                    : "Select a resume from the list to edit it."}
                            </p>
                        )}
                    </section>

                    {/* 🔹 Suggestions / Feedback card */}
                    <section
                        style={{
                            marginTop: "8px",
                            backgroundColor: "#020617",
                            borderRadius: "16px",
                            padding: "16px",
                            border: "1px solid #1f2937",
                        }}
                    >
                        <h3
                            style={{
                                margin: "0 0 8px 0",
                                fontSize: "14px",
                                opacity: 0.95,
                            }}
                        >
                            {t.suggestionTitle}
                        </h3>
                        <textarea
                            value={suggestionText}
                            onChange={(e) => {
                                setSuggestionText(e.target.value);
                                setSuggestionError(null);
                                setSuggestionSuccess(null);
                            }}
                            placeholder={t.suggestionPlaceholder}
                            style={{
                                width: "100%",
                                minHeight: "80px",
                                resize: "vertical",
                                padding: "8px 10px",
                                borderRadius: "10px",
                                border: "1px solid #1f2937",
                                backgroundColor: "#020617",
                                color: "white",
                                fontSize: "12px",
                                marginBottom: "8px",
                            }}
                        />
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleSubmitSuggestion}
                                disabled={suggestionSending || !suggestionText.trim()}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: "999px",
                                    border: "none",
                                    cursor:
                                        suggestionSending || !suggestionText.trim()
                                            ? "not-allowed"
                                            : "pointer",
                                    background:
                                        "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                                    color: "#020617",
                                    fontWeight: 600,
                                    fontSize: "12px",
                                    opacity:
                                        suggestionSending || !suggestionText.trim() ? 0.7 : 1,
                                }}
                            >
                                {suggestionSending
                                    ? t.suggestionSending
                                    : t.suggestionButton}
                            </button>

                            <div style={{ fontSize: "11px", minHeight: "1.5em" }}>
                                {suggestionSuccess && (
                                    <span style={{ color: "#4ade80" }}>{suggestionSuccess}</span>
                                )}
                                {suggestionError && (
                                    <span style={{ color: "#f97316" }}>{suggestionError}</span>
                                )}
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
