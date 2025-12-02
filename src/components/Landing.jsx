// src/components/Landing.jsx
import React from "react";

export default function Landing({ lang = "en", onChangeLang, onGetStarted }) {
    const isSpanish = lang === "es";

    const t = {
        badge: isSpanish ? "Impulsado por IA" : "AI-powered resume builder",
        h1: isSpanish
            ? "Transforma tu currículum en minutos."
            : "Transform your resume in minutes.",
        sub: isSpanish
            ? "Carga tu currículum o empieza desde cero. Déjale el texto a la IA de MindMyResume y descárgalo como PDF profesional listo para aplicar."
            : "Upload your resume or start from scratch. Let MindMyResume’s AI polish your content and export a professional, job-ready PDF.",
        ctaPrimary: isSpanish ? "Comenzar ahora" : "Start now",
        ctaSecondary: isSpanish ? "Ver cómo funciona" : "See how it works",
        heroBullet1: isSpanish
            ? "Plantilla limpia, lista para ATS"
            : "Clean, ATS-friendly template",
        heroBullet2: isSpanish
            ? "Reescrituras inteligentes con IA"
            : "Smart AI rewrites for your role",
        heroBullet3: isSpanish
            ? "Descarga en PDF con formato profesional"
            : "Export as professionally formatted PDF",
        langLabel: isSpanish ? "Idioma" : "Language",
        langEn: "English",
        langEs: "Español",

        // HOW IT WORKS
        howTitle: isSpanish ? "Cómo funciona MindMyResume" : "How MindMyResume works",
        step1Title: isSpanish ? "1. Crea o sube tu currículum" : "1. Create or upload your resume",
        step1Body: isSpanish
            ? "Ingresa tu información o pega tu currículum actual. Muy pronto podrás subir Word, PDF y más formatos."
            : "Enter your details or paste your current resume. Native Word/PDF upload is coming soon.",
        step2Title: isSpanish ? "2. Indica el puesto objetivo" : "2. Add your target role",
        step2Body: isSpanish
            ? "Pega la descripción del puesto y deja que la IA adapte tu experiencia a lo que busca el empleador."
            : "Paste the job description and let AI tailor your experience to what the employer is looking for.",
        step3Title: isSpanish ? "3. Pulir, guardar y descargar" : "3. Polish, save & download",
        step3Body: isSpanish
            ? "Edita los detalles, guarda tu currículum por hasta 2 años y descárgalo en PDF cuando estés listo."
            : "Refine the details, save your resume for up to 2 years, and download it as a PDF when you’re ready.",

        // WHY SECTION
        whyTitle: isSpanish ? "Por qué MindMyResume" : "Why MindMyResume",
        why1Title: isSpanish ? "Diseño simple y profesional" : "Simple, professional design",
        why1Body: isSpanish
            ? "Un formato limpio que se ve bien en pantalla y en papel, sin gráficos exagerados ni distracciones."
            : "A clean layout that looks great on screen and on paper—no distracting graphics, just focused content.",
        why2Title: isSpanish ? "Texto que suena a ti" : "Text that sounds like you",
        why2Body: isSpanish
            ? "La IA te ayuda a mejorar tu mensaje sin perder tu voz. Tú tienes el control final del contenido."
            : "AI helps you sharpen your message without losing your voice. You stay in control of the final content.",
        why3Title: isSpanish ? "Costo único, sin suscripciones" : "One-time cost, no subscription",
        why3Body: isSpanish
            ? "Un solo pago desbloquea tu panel, reescrituras con IA y acceso a tus currículums por 2 años."
            : "A single payment unlocks your dashboard, AI rewrites, and access to your resumes for 2 years.",

        // FOOTER STRIP
        trustTitle: isSpanish ? "Construido sobre tecnología confiable" : "Built on trusted technology",
        trust1: isSpanish ? "Pagos seguros con Stripe" : "Secure payments with Stripe",
        trust2: isSpanish ? "Alojado en AWS Amplify" : "Hosted on AWS Amplify",
        trust3: isSpanish ? "IA de última generación" : "Powered by modern AI",
    };

    const handleLangClick = (newLang) => {
        if (onChangeLang) onChangeLang(newLang);
    };

    const handleGetStarted = () => {
        if (onGetStarted) onGetStarted();
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#020617",
                color: "white",
                display: "flex",
                justifyContent: "center",
                padding: "24px 16px 48px",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "1120px",
                    margin: "0 auto",
                }}
            >
                {/* TOP NAV / LOGO */}
                <header
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "32px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "999px",
                                background:
                                    "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                            }}
                        />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>MindMyResume</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {isSpanish ? "Tu currículum. Reimaginado." : "Your resume. Reimagined."}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* Language toggle */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                                opacity: 0.9,
                            }}
                        >
                            <span>{t.langLabel}:</span>
                            <div
                                style={{
                                    display: "inline-flex",
                                    borderRadius: 999,
                                    border: "1px solid #1f2937",
                                    padding: 2,
                                    backgroundColor: "#020617",
                                }}
                            >
                                <button
                                    onClick={() => handleLangClick("en")}
                                    style={{
                                        border: "none",
                                        borderRadius: 999,
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        cursor: "pointer",
                                        backgroundColor: !isSpanish ? "#0f172a" : "transparent",
                                        color: "white",
                                    }}
                                >
                                    {t.langEn}
                                </button>
                                <button
                                    onClick={() => handleLangClick("es")}
                                    style={{
                                        border: "none",
                                        borderRadius: 999,
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        cursor: "pointer",
                                        backgroundColor: isSpanish ? "#0f172a" : "transparent",
                                        color: "white",
                                    }}
                                >
                                    {t.langEs}
                                </button>
                            </div>
                        </div>

                        {/* Simple "Sign in" or "Go to app" text button */}
                        <button
                            onClick={handleGetStarted}
                            style={{
                                borderRadius: 999,
                                border: "1px solid #334155",
                                backgroundColor: "transparent",
                                color: "white",
                                fontSize: 12,
                                padding: "6px 14px",
                                cursor: "pointer",
                            }}
                        >
                            {isSpanish ? "Ir al generador" : "Go to builder"}
                        </button>
                    </div>
                </header>

                {/* HERO SECTION */}
                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
                        gap: "32px",
                        alignItems: "center",
                        marginBottom: "48px",
                    }}
                >
                    {/* Left: text */}
                    <div>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 11,
                                backgroundColor: "#022c22",
                                color: "#6ee7b7",
                                marginBottom: 12,
                            }}
                        >
              <span
                  style={{
                      width: 6,
                      height: 6,
                      borderRadius: "999px",
                      backgroundColor: "#22c55e",
                  }}
              />
                            <span>{t.badge}</span>
                        </div>

                        <h1
                            style={{
                                fontSize: "32px",
                                lineHeight: 1.2,
                                margin: "0 0 12px 0",
                            }}
                        >
                            {t.h1}
                        </h1>

                        <p
                            style={{
                                margin: "0 0 18px 0",
                                fontSize: 14,
                                opacity: 0.85,
                                maxWidth: 520,
                            }}
                        >
                            {t.sub}
                        </p>

                        <ul
                            style={{
                                listStyle: "none",
                                padding: 0,
                                margin: "0 0 20px 0",
                                fontSize: 13,
                                opacity: 0.9,
                            }}
                        >
                            <li style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ color: "#22c55e" }}>✓</span>
                                <span>{t.heroBullet1}</span>
                            </li>
                            <li style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ color: "#22c55e" }}>✓</span>
                                <span>{t.heroBullet2}</span>
                            </li>
                            <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: "#22c55e" }}>✓</span>
                                <span>{t.heroBullet3}</span>
                            </li>
                        </ul>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <button
                                onClick={handleGetStarted}
                                style={{
                                    border: "none",
                                    borderRadius: 999,
                                    padding: "10px 20px",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    background:
                                        "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                                    color: "#020617",
                                }}
                            >
                                {t.ctaPrimary}
                            </button>
                            <button
                                onClick={handleGetStarted}
                                style={{
                                    borderRadius: 999,
                                    border: "1px solid #334155",
                                    padding: "10px 16px",
                                    fontSize: 13,
                                    cursor: "pointer",
                                    backgroundColor: "transparent",
                                    color: "white",
                                }}
                            >
                                {t.ctaSecondary}
                            </button>
                        </div>

                        <p
                            style={{
                                marginTop: 14,
                                fontSize: 11,
                                opacity: 0.7,
                            }}
                        >
                            {isSpanish
                                ? "Pago único, sin suscripciones. Tus currículums permanecen disponibles por hasta 2 años."
                                : "One-time payment, no subscriptions. Your resumes stay available for up to 2 years."}
                        </p>
                    </div>

                    {/* Right: simple preview card to suggest the builder */}
                    <div
                        style={{
                            borderRadius: 24,
                            padding: 16,
                            background:
                                "radial-gradient(circle at top, #0f172a 0%, #020617 60%, #000000 100%)",
                            border: "1px solid #1e293b",
                            boxShadow: "0 18px 40px rgba(15,23,42,0.7)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                opacity: 0.8,
                                marginBottom: 8,
                                display: "flex",
                                justifyContent: "space-between",
                            }}
                        >
                            <span>{isSpanish ? "Vista previa" : "Preview"}</span>
                            <span>{isSpanish ? "Plantilla básica" : "Basic template"}</span>
                        </div>

                        <div
                            style={{
                                borderRadius: 16,
                                backgroundColor: "#020617",
                                border: "1px solid #1f2937",
                                padding: "16px 18px",
                                fontSize: 11,
                                color: "#e5e7eb",
                                maxHeight: 320,
                                overflow: "hidden",
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                                Jane Doe
                            </div>
                            <div style={{ opacity: 0.8, marginBottom: 8 }}>
                                Austin, TX • jane.doe@email.com • (555) 555-5555
                            </div>
                            <div style={{ fontWeight: 600, marginTop: 4, marginBottom: 2 }}>
                                {isSpanish ? "Perfil profesional" : "Professional Summary"}
                            </div>
                            <p style={{ margin: 0, opacity: 0.85 }}>
                                {isSpanish
                                    ? "Profesional orientada a resultados con experiencia en servicio al cliente y ventas, enfocada en construir relaciones y superar objetivos."
                                    : "Results-driven professional with experience in customer service and sales, focused on building relationships and exceeding targets."}
                            </p>

                            <div style={{ fontWeight: 600, marginTop: 10, marginBottom: 2 }}>
                                {isSpanish ? "Experiencia" : "Experience"}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                                <li>
                                    {isSpanish
                                        ? "Aumentó la satisfacción del cliente al resolver solicitudes de manera rápida y profesional."
                                        : "Boosted customer satisfaction by resolving requests quickly and professionally."}
                                </li>
                                <li>
                                    {isSpanish
                                        ? "Colaboró con equipos multifuncionales para mejorar procesos y resultados."
                                        : "Collaborated with cross-functional teams to improve processes and outcomes."}
                                </li>
                            </ul>

                            <div style={{ fontWeight: 600, marginTop: 10, marginBottom: 2 }}>
                                {isSpanish ? "Habilidades" : "Skills"}
                            </div>
                            <p style={{ margin: 0 }}>
                                {isSpanish
                                    ? "Atención al detalle • Comunicación • Bilingüe (ESP/ING)"
                                    : "Attention to detail • Communication • Bilingual (EN/ES)"}
                            </p>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.howTitle}</h2>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "#020617",
                                borderRadius: 16,
                                border: "1px solid #1f2937",
                                padding: 16,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ fontSize: 22, marginBottom: 6 }}>📝</div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.step1Title}</div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{t.step1Body}</p>
                        </div>
                        <div
                            style={{
                                backgroundColor: "#020617",
                                borderRadius: 16,
                                border: "1px solid #1f2937",
                                padding: 16,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ fontSize: 22, marginBottom: 6 }}>🎯</div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.step2Title}</div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{t.step2Body}</p>
                        </div>
                        <div
                            style={{
                                backgroundColor: "#020617",
                                borderRadius: 16,
                                border: "1px solid #1f2937",
                                padding: 16,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ fontSize: 22, marginBottom: 6 }}>📄</div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.step3Title}</div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{t.step3Body}</p>
                        </div>
                    </div>
                </section>

                {/* WHY SECTION */}
                <section style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.whyTitle}</h2>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "#020617",
                                borderRadius: 16,
                                border: "1px solid #1f2937",
                                padding: 16,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.why1Title}</div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{t.why1Body}</p>
                        </div>
                        <div
                            style={{
                                backgroundColor: "#020617",
                                borderRadius: 16,
                                border: "1px solid #1f2937",
                                padding: 16,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.why2Title}</div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{t.why2Body}</p>
                        </div>
                        <div
                            style={{
                                backgroundColor: "#020617",
                                borderRadius: 16,
                                border: "1px solid #1f2937",
                                padding: 16,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.why3Title}</div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{t.why3Body}</p>
                        </div>
                    </div>
                </section>

                {/* TRUST STRIP */}
                <section
                    style={{
                        borderTop: "1px solid #111827",
                        paddingTop: 16,
                        fontSize: 11,
                        opacity: 0.8,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ fontWeight: 500 }}>{t.trustTitle}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>🔒 {t.trust1}</span>
                        <span>☁️ {t.trust2}</span>
                        <span>🤖 {t.trust3}</span>
                    </div>
                </section>
            </div>
        </div>
    );
}
