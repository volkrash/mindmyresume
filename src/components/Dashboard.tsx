// src/components/Dashboard.tsx
import { useEffect, useState, useRef } from "react";
import { client } from "../amplifyClient";
import jsPDF from "jspdf";
import { ModernCleanTemplate } from "../templates/ModernCleanTemplate";

// Config via Vite env vars
const STRIPE_PAYMENT_URL = import.meta.env.VITE_STRIPE_PAYMENT_URL || null;
const REWRITE_URL = import.meta.env.VITE_REWRITE_URL || null;

const PAID_FLAG_KEY = "mmr_hasPaid";
const REWRITE_CREDITS_KEY = "mmr_rewrite_credits";

// how many AI rewrites per payment
const REWRITES_PER_PURCHASE = 10;

function ClassicTemplate({ content, jobDescription }) {
    return (
        <div
            style={{
                width: "100%",
                maxWidth: "800px",
                minHeight: "1050px", // close to A4 at 72dpi
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
            {/* Header placeholder – later you can split name/contact from content */}
            <div style={{ marginBottom: "16px", borderBottom: "2px solid #e5e7eb", paddingBottom: "8px" }}>
                <h1
                    style={{
                        margin: 0,
                        fontSize: "20pt",
                        letterSpacing: "0.03em",
                    }}
                >
                    {/* In MVP we don’t parse name – this will just be blank or you can instruct user to start resume with name */}
                </h1>
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

            {/* Body – for now just the resume text, you can later detect headings and style them */}
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
// Simple parser: first line = name, second = title,
// then sections split by headings like EXPERIENCE / EDUCATION / SKILLS
function parseSectionsFromEditorContent(text: string, isSpanish: boolean) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trimEnd());

    let idx = 0;

    // Skip leading empty lines
    while (idx < lines.length && !lines[idx].trim()) idx++;

    const name = lines[idx] || (isSpanish ? "Nombre Apellido" : "Your Name");
    idx++;

    while (idx < lines.length && !lines[idx].trim()) idx++;
    const title =
        lines[idx] ||
        (isSpanish ? "Título profesional" : "Professional Title");
    idx++;

    const sections = {
        summary: [] as string[],
        experience: [] as string[],
        education: [] as string[],
        skills: [] as string[],
    };

    let current: keyof typeof sections = "summary";

    for (; idx < lines.length; idx++) {
        const raw = lines[idx];
        const line = raw.trim();

        if (!line) {
            sections[current].push("");
            continue;
        }

        const upper = line.toUpperCase();

        // EXPERIENCE / EXPERIENCIA
        if (upper.startsWith("EXPERIENCE") || upper.startsWith("EXPERIENCIA")) {
            current = "experience";
            continue;
        }

        // EDUCATION / EDUCACIÓN
        if (
            upper.startsWith("EDUCATION") ||
            upper.startsWith("EDUCACIÓN") ||
            upper.startsWith("EDUCACION")
        ) {
            current = "education";
            continue;
        }

        // SKILLS / HABILIDADES
        if (upper.startsWith("SKILLS") || upper.startsWith("HABILIDADES")) {
            current = "skills";
            continue;
        }

        sections[current].push(raw);
    }

    return { name, title, sections };
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

    const [hasPaid, setHasPaid] = useState(false);
    const [rewriteCredits, setRewriteCredits] = useState(0);
    const [activeResume, setActiveResume] = useState<any | null>(null);
    const [editorContent, setEditorContent] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState("classic");
    const previewRef = useRef<HTMLDivElement | null>(null); //


    const isSpanish = lang === "es";

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
        payTitle: isSpanish ? "Desbloquea el editor con IA" : "Unlock the AI editor",
        payText: isSpanish
            ? `Realiza un pago único de $15 para crear currículums y obtener ${REWRITES_PER_PURCHASE} reescrituras con IA.`
            : `Make a one-time $15 payment to create resumes and get ${REWRITES_PER_PURCHASE} AI rewrites.`,
        payButton: isSpanish ? "Pagar $15" : "Pay $15",
        editorTitle: isSpanish ? "Editor de currículum" : "Resume editor",
        saveChanges: isSpanish ? "Guardar cambios" : "Save changes",
        rewritesLeft: isSpanish
            ? "Reescrituras con IA restantes"
            : "AI rewrites left",
        uploadLabel: isSpanish
            ? "Subir archivo (.txt)"
            : "Upload resume file (.txt)",
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

    // Detect payment & load credits
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const checkoutStatus = params.get("checkout");

            if (checkoutStatus === "success") {
                setHasPaid(true);
                localStorage.setItem(PAID_FLAG_KEY, "true");

                setRewriteCredits(REWRITES_PER_PURCHASE);
                localStorage.setItem(
                    REWRITE_CREDITS_KEY,
                    String(REWRITES_PER_PURCHASE),
                );

                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, "", cleanUrl);
                return;
            }

            const storedPaid = localStorage.getItem(PAID_FLAG_KEY);
            const storedCredits = localStorage.getItem(REWRITE_CREDITS_KEY);

            if (storedPaid === "true") {
                setHasPaid(true);
                if (storedCredits && !Number.isNaN(parseInt(storedCredits, 10))) {
                    setRewriteCredits(parseInt(storedCredits, 10));
                }
            }
        } catch (err) {
            console.error("Error checking payment status", err);
        }
    }, []);

    const handleStripePayment = () => {
        if (!STRIPE_PAYMENT_URL) {
            alert(
                isSpanish
                    ? "Falta configurar VITE_STRIPE_PAYMENT_URL en .env.local."
                    : "VITE_STRIPE_PAYMENT_URL is not configured in .env.local.",
            );
            return;
        }
        window.location.href = STRIPE_PAYMENT_URL;
    };

    // DEV helper to simulate payment
    const handleFakePayment = () => {
        if (
            window.confirm(
                isSpanish
                    ? "Simular pago único de $15 y desbloquear todas las funciones?"
                    : "Simulate a one-time $15 payment and unlock all features?",
            )
        ) {
            setHasPaid(true);
            localStorage.setItem(PAID_FLAG_KEY, "true");
            setRewriteCredits(REWRITES_PER_PURCHASE);
            localStorage.setItem(
                REWRITE_CREDITS_KEY,
                String(REWRITES_PER_PURCHASE),
            );
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return;
        if (!hasPaid) {
            alert(
                isSpanish
                    ? "Debes completar el pago de $15 antes de crear currículums."
                    : "You must complete the $15 payment before creating resumes.",
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
                        : "An error occurred while creating the resume.",
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
                    : "An error occurred while creating the resume.",
            );
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (
            !window.confirm(
                isSpanish ? "¿Eliminar este currículum?" : "Delete this resume?",
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
                    : "Error saving changes.",
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
                        : "For now only plain text (.txt) files are supported. Export your resume to .txt and upload it.",
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
                    : "There was a problem reading the file.",
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

        // Parse content like the template:
        const lines = editorContent
            .split(/\r?\n/)
            .map((l) => l.trimEnd())
            .filter((l) => l.trim().length > 0);

        const nameLine = lines[0] || (isSpanish ? "Nombre Apellido" : "Your Name");
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
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(nameLine, marginX, y);
        y += 26;

        // Subtitle: Title
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(titleLine, marginX, y);
        y += 24;

        // Optional: Target role from jobDescription
        if (jobDescription && jobDescription.trim()) {
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128); // slate-500

            const label = isSpanish ? "Puesto objetivo" : "Target role";
            doc.text(label.toUpperCase(), pageWidth - marginX - 200, marginTop);

            const jdText = doc.splitTextToSize(jobDescription, 190);
            doc.setDrawColor(209, 213, 219); // gray-300
            doc.setLineWidth(0.5);
            doc.rect(pageWidth - marginX - 200, marginTop + 10, 200, 60);
            doc.text(jdText, pageWidth - marginX - 194, marginTop + 24);

            y += 8; // small separation
        }

        // Divider line
        y += 4;
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.setLineWidth(0.8);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 20;

        // Section title
        const sectionTitle = isSpanish ? "Perfil profesional" : "Professional Profile";
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99); // gray-600
        doc.text(sectionTitle.toUpperCase(), marginX, y);
        y += 16;

        // Body text
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39); // gray-900

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
                    : "The AI service is not configured.",
            );
            return;
        }

        if (!activeResume) {
            alert(
                isSpanish
                    ? "Selecciona un currículum de la lista primero."
                    : "Select a resume from the list first.",
            );
            return;
        }

        if (!editorContent.trim()) {
            alert(
                isSpanish
                    ? "Primero escribe o pega tu currículum."
                    : "Please paste or type your resume first.",
            );
            return;
        }

        if (!hasPaid) {
            alert(
                isSpanish
                    ? "Debes completar el pago de $15 antes de usar la IA."
                    : "You must complete the $15 payment before using AI.",
            );
            return;
        }

        if (rewriteCredits <= 0) {
            alert(
                isSpanish
                    ? "Has agotado tus reescrituras con IA."
                    : "You have used all your AI rewrites.",
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

            const remaining = rewriteCredits - 1;
            setRewriteCredits(remaining);
            localStorage.setItem(REWRITE_CREDITS_KEY, String(remaining));

            alert(
                isSpanish
                    ? "Tu currículum ha sido reescrito con IA."
                    : "Your resume has been rewritten with AI.",
            );
        } catch (err) {
            console.error("AI call failed", err);
            alert(
                isSpanish ? "Error al llamar al servicio de IA." : "Error calling AI.",
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
                        <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>
                            {t.rewritesLeft}: {hasPaid ? rewriteCredits : 0}
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
                {!hasPaid && (
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
                        <p style={{ margin: "0 0 12px 0", fontSize: "14px", opacity: 0.9 }}>
                            {t.payText}
                        </p>

                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <button
                                onClick={handleStripePayment}
                                style={{
                                    background:
                                        "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "999px",
                                    color: "#020617",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                }}
                            >
                                {t.payButton}
                            </button>
                            <button
                                onClick={handleFakePayment}
                                style={{
                                    backgroundColor: "#f59e0b",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "999px",
                                    color: "#020617",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                }}
                            >
                                {isSpanish ? "Simular pago (DEV)" : "Simulate payment (DEV)"}
                            </button>
                        </div>

                        <p style={{ marginTop: "8px", fontSize: "11px", opacity: 0.7 }}>
                            {isSpanish
                                ? "En producción, elimina el botón de simulación."
                                : "In production, remove the simulate button."}
                        </p>
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
                                {isSpanish ? "Crear un nuevo currículum" : "Create a new resume"}
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
                                        opacity: hasPaid ? 1 : 0.6,
                                    }}
                                >
                                    {creating
                                        ? isSpanish
                                            ? "Creando..."
                                            : "Creating..."
                                        : t.createButton}
                                </button>
                            </div>
                            {!hasPaid && (
                                <p
                                    style={{ marginTop: "8px", fontSize: "11px", color: "#f97316" }}
                                >
                                    {isSpanish
                                        ? "Completa el pago para habilitar la creación."
                                        : "Complete payment to enable creation."}
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
                                                    (expiresMs - now) / (1000 * 60 * 60 * 24),
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
                                    <option value="classic">{isSpanish ? "Clásica" : "Classic"}</option>
                                    {/* you can add more later:
      <option value="modern">Modern</option>
      */}
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
                                {/* Live preview for PDF export */}
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

                                {/* Bottom controls: upload/PDF + AI/Save */}
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
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                                            disabled={aiLoading || !hasPaid}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: "999px",
                                                border: "none",
                                                cursor: aiLoading ? "wait" : "pointer",
                                                backgroundColor: hasPaid ? "#6366f1" : "#4b5563",
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
