// src/components/Dashboard.tsx
import { useEffect, useState, useRef } from "react";
import { client } from "../amplifyClient";
import jsPDF from "jspdf";
import { ModernCleanTemplate } from "../templates/ModernCleanTemplate";

// Config via Vite env vars
const STRIPE_UNLIMITED_URL = import.meta.env.VITE_STRIPE_UNLIMITED_URL || null;
const STRIPE_CREDITS_URL = import.meta.env.VITE_STRIPE_CREDITS_URL || null;
const REWRITE_URL = import.meta.env.VITE_REWRITE_URL || null;

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
    const [selectedTemplate, setSelectedTemplate] = useState("classic");

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
        uploadLabel: isSpanish ? "Subir archivo (.txt)" : "Upload resume file (.txt)",
        uploadHint: isSpanish
            ? "Por ahora solo .txt. Exporta tu currículum de Word/Google Docs/Pages a .txt y súbelo."
            : "For now only .txt. Export your Word/Google Docs/Pages resume as .txt and upload it.",
        downloadPdf: isSpanish ? "Descargar como PDF" : "Download as PDF",
        templateLabel: isSpanish ? "Plantilla" : "Template",
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
                aiJson: JSON.stringify({ content: placeholderContent }),
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
        try {
            if (resume.aiJson) {
                const parsed = JSON.parse(resume.aiJson);
                if (typeof parsed === "string") content = parsed;
                else if (parsed && typeof parsed === "object" && "content" in parsed)
                    content = (parsed as any).content || "";
            }
        } catch {
            content = resume.aiJson || "";
        }

        setEditorContent(content);
    };

    const handleSaveChanges = async () => {
        if (!activeResume) return;
        try {
            const { data: updated } = await client.models.Resume.update({
                id: activeResume.id,
                aiJson: JSON.stringify({ content: editorContent }),
            });

            setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setActiveResume(updated);
            alert(isSpanish ? "Cambios guardados." : "Changes saved.");
        } catch (err) {
            console.error("Error updating resume", err);
            alert(
                isSpanish
                    ? "Error al guardar los cambios."
                    : "Error saving changes."
            );
        }
    };

    // file upload (MVP: .txt)
    const handleFileUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            if (file.type !== "text/plain") {
                alert(
                    isSpanish
                        ? "Por ahora solo se admiten archivos de texto (.txt). Exporta tu currículum a .txt y súbelo."
                        : "For now only plain text (.txt) files are supported. Export your resume to .txt and upload it."
                );
                return;
            }

            const text = await file.text();
            setEditorContent(text);
        } catch (err) {
            console.error("Error reading file", err);
            alert(
                isSpanish
                    ? "Hubo un problema leyendo el archivo."
                    : "There was a problem reading the file."
            );
        } finally {
            setUploading(false);
            e.target.value = "";
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

        // Simple parse for header + body
        const lines = editorContent
            .split(/\r?\n/)
            .map((l) => l.trimEnd())
            .filter((l) => l.trim().length > 0);

        const nameLine =
            lines[0] || (isSpanish ? "Nombre Apellido" : "Your Name");
        const titleLine =
            lines[1] || (isSpanish ? "Título profesional" : "Professional Title");
        const bodyLines = lines.slice(2);
        const bodyText =
            bodyLines.join("\n") ||
            (isSpanish
                ? "Agrega tu experiencia, habilidades y educación aquí."
                : "Add your experience, skills, and education here.");

        const doc = new jsPDF({
            unit: "pt",
            format: "a4",
            orientation: "portrait",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 48;
        const marginTop = 60;
        const marginBottom = 60;

        let y = marginTop;

        // Header: Name
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text(nameLine, marginX, y);
        y += 26;

        // Subtitle: Title
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(titleLine, marginX, y);
        y += 24;

        // Optional small job description box
        if (jobDescription && jobDescription.trim()) {
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);

            const label = isSpanish ? "Puesto objetivo" : "Target role";
            doc.text(label.toUpperCase(), pageWidth - marginX - 200, marginTop);

            const jdText = doc.splitTextToSize(jobDescription, 190);
            doc.setDrawColor(209, 213, 219);
            doc.setLineWidth(0.5);
            doc.rect(pageWidth - marginX - 200, marginTop + 10, 200, 60);
            doc.text(jdText, pageWidth - marginX - 194, marginTop + 24);

            y += 8;
        }

        // Divider
        y += 4;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.8);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 20;

        // Section title
        const sectionTitle = isSpanish ? "Perfil profesional" : "Professional Profile";
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(sectionTitle.toUpperCase(), marginX, y);
        y += 16;

        // Body text
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);

        const maxWidth = pageWidth - marginX * 2;
        const bodyLinesWrapped = doc.splitTextToSize(bodyText, maxWidth);

        bodyLinesWrapped.forEach((line) => {
            if (y > pageHeight - marginBottom) {
                doc.addPage();
                y = marginTop;
            }
            doc.text(line, marginX, y);
            y += 16;
        });

        const safeTitle = (activeResume?.title || "resume").replace(
            /[^a-z0-9\-]+/gi,
            "_"
        );
        doc.save(`${safeTitle}.pdf`);
    };

    const handleRewriteWithAI = async () => {
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
                aiJson: JSON.stringify({ content: rewrittenText }),
            });

            setActiveResume(updated);
            setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

            // Decrement credit only if NOT unlimited
            if (!hasUnlimited) {
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
                        <div
                            style={{
                                marginTop: "2px",
                                fontSize: "11px",
                                opacity: 0.8,
                            }}
                        >
                            {hasUnlimited ? (
                                <>
                                    {isSpanish ? "IA: ilimitada" : "AI: unlimited"}{" "}
                                    {unlimitedExpiresAt && (
                                        <>
                                            {isSpanish ? "hasta" : "until"}{" "}
                                            {new Date(unlimitedExpiresAt).toLocaleDateString()}
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {t.rewritesLeft}: {rewriteCredits}
                                </>
                            )}
                        </div>
                        <button
                            onClick={onSignOut}
                            style={{
                                marginTop: "6px",
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
                                    {isSpanish
                                        ? "Comprar 5 reescrituras"
                                        : "Buy 5 rewrites"}
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
                                    style={{ marginTop: "8px", fontSize: "11px", color: "#f97316" }}
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
                                                    accept=".txt"
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
                </main>
            </div>
        </div>
    );
}