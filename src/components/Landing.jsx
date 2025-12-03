// src/components/Landing.jsx

export default function Landing({ lang, onLanguageChange, onGetStarted }) {
    const isSpanish = lang === "es";

    const t = {
        heroEyebrow: isSpanish ? "Impulsado por IA, centrado en ti" : "AI-powered, centered on you",
        heroTitle: isSpanish
            ? "Convierte tu experiencia en un currículum que consiga entrevistas."
            : "Turn your experience into a resume that gets interviews.",
        heroSubtitle: isSpanish
            ? "En menos de 10 minutos, crea un currículum limpio, profesional y optimizado para el puesto que quieres. Sin plantillas complicadas ni formatos raros."
            : "In under 10 minutes, create a clean, professional resume tailored to the job you want. No messy templates or formatting headaches.",
        heroPrimary: isSpanish
            ? "Empieza ahora — 90 días por $24.99"
            : "Get started — 90 days for $24.99",
        heroSecondary: isSpanish ? "Ver cómo funciona" : "See how it works",

        navProduct: isSpanish ? "Cómo funciona" : "How it works",
        navPricing: isSpanish ? "Planes" : "Pricing",
        navSignIn: isSpanish ? "Iniciar sesión" : "Sign in",

        bullet1: isSpanish
            ? "Reescrituras con IA adaptadas a cada oferta de trabajo."
            : "AI rewrites tailored to each job description.",
        bullet2: isSpanish
            ? "Plantilla limpia y profesional lista para descargar en PDF."
            : "Clean, professional template ready to download as PDF.",
        bullet3: isSpanish
            ? "Tus currículums guardados de forma segura mientras buscas trabajo."
            : "Your resumes saved securely while you job hunt.",

        howTitle: isSpanish ? "Cómo funciona" : "How it works",
        howStep1Title: isSpanish ? "1. Cuéntanos de ti" : "1. Tell us about you",
        howStep1Desc: isSpanish
            ? "Pega tu currículum actual o escribe tu experiencia desde cero en el editor."
            : "Paste your existing resume or write your experience from scratch in the editor.",
        howStep2Title: isSpanish ? "2. Añade la oferta" : "2. Add the job description",
        howStep2Desc: isSpanish
            ? "Pega la descripción del puesto al que quieres aplicar y deja que la IA haga su trabajo."
            : "Paste the job description for the role you want and let the AI do the heavy lifting.",
        howStep3Title: isSpanish ? "3. Exporta y aplica" : "3. Export and apply",
        howStep3Desc: isSpanish
            ? "Revisa el contenido, ajusta lo que quieras y descarga un PDF impecable listo para enviar."
            : "Review the content, tweak anything you like, and download a polished PDF ready to send.",

        planTitle: isSpanish ? "Plan de 90 días" : "90-Day Job Hunt Plan",
        planPriceLine: isSpanish
            ? "$24.99 por 90 días de acceso completo."
            : "$24.99 for 90 days of full access.",
        planLine1: isSpanish
            ? "Acceso completo al editor con IA, reescrituras y exportación a PDF."
            : "Full access to AI resume rewrites and clean PDF export.",
        planLine2: isSpanish
            ? "Hasta 10 reescrituras con IA para adaptar tu currículum a distintos puestos."
            : "Up to 10 AI rewrites to tailor your resume to different roles.",
        planLine3: isSpanish
            ? "Te avisamos cuando estén por vencer tus 90 días para que puedas renovar sólo si lo necesitas."
            : "We remind you when your 90 days are almost up so you only renew if you still need it.",
        planCta: isSpanish ? "Empezar con este plan" : "Start with this plan",
    };

    return (
        <div
            style={{
                width: "100%",
                color: "white",
                fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            }}
        >
            {/* Top nav */}
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                }}
            >
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: "999px",
                            background:
                                "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>MindMyResume</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                            {isSpanish ? "Tu currículum. Reimaginado." : "Your resume. Reimagined."}
                        </div>
                    </div>
                </div>

                {/* Nav links + language toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button
                        type="button"
                        onClick={() => {
                            const elem = document.getElementById("how-it-works-section");
                            if (elem) {
                                elem.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#e5e7eb",
                            fontSize: 12,
                            cursor: "pointer",
                        }}
                    >
                        {t.navProduct}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const elem = document.getElementById("plan-section");
                            if (elem) {
                                elem.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#e5e7eb",
                            fontSize: 12,
                            cursor: "pointer",
                        }}
                    >
                        {t.navPricing}
                    </button>

                    <button
                        type="button"
                        onClick={onGetStarted}
                        style={{
                            backgroundColor: "transparent",
                            border: "1px solid #4b5563",
                            borderRadius: "999px",
                            padding: "6px 12px",
                            color: "#e5e7eb",
                            fontSize: 12,
                            cursor: "pointer",
                        }}
                    >
                        {t.navSignIn}
                    </button>

                    {/* Language toggle */}
                    <div
                        style={{
                            display: "inline-flex",
                            borderRadius: "999px",
                            border: "1px solid #374151",
                            overflow: "hidden",
                            fontSize: 11,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => onLanguageChange("en")}
                            style={{
                                padding: "4px 8px",
                                border: "none",
                                cursor: "pointer",
                                backgroundColor: lang === "en" ? "#16a34a" : "transparent",
                                color: lang === "en" ? "#020617" : "#e5e7eb",
                            }}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => onLanguageChange("es")}
                            style={{
                                padding: "4px 8px",
                                border: "none",
                                cursor: "pointer",
                                backgroundColor: lang === "es" ? "#16a34a" : "transparent",
                                color: lang === "es" ? "#020617" : "#e5e7eb",
                            }}
                        >
                            ES
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 32,
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                }}
            >
                {/* Left hero text */}
                <section
                    style={{
                        flex: "1 1 320px",
                        maxWidth: 520,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            color: "#a3e635",
                            marginBottom: 8,
                        }}
                    >
                        {t.heroEyebrow}
                    </div>
                    <h1
                        style={{
                            margin: 0,
                            marginBottom: 10,
                            fontSize: 30,
                            lineHeight: 1.2,
                        }}
                    >
                        {t.heroTitle}
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            marginBottom: 16,
                            fontSize: 14,
                            opacity: 0.8,
                        }}
                    >
                        {t.heroSubtitle}
                    </p>

                    <ul
                        style={{
                            listStyle: "none",
                            padding: 0,
                            margin: "0 0 18px 0",
                            fontSize: 13,
                            opacity: 0.9,
                        }}
                    >
                        <li style={{ marginBottom: 6 }}>• {t.bullet1}</li>
                        <li style={{ marginBottom: 6 }}>• {t.bullet2}</li>
                        <li style={{ marginBottom: 6 }}>• {t.bullet3}</li>
                    </ul>

                    {/* Hero buttons */}
                    <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={onGetStarted}
                            style={{
                                padding: "9px 18px",
                                borderRadius: "999px",
                                border: "none",
                                cursor: "pointer",
                                background:
                                    "linear-gradient(135deg, #22c55e 0%, #2dd4bf 45%, #60a5fa 100%)",
                                color: "#020617",
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {t.heroPrimary}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const elem = document.getElementById("how-it-works-card");
                                if (elem) {
                                    elem.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                            }}
                            style={{
                                padding: "9px 16px",
                                borderRadius: "999px",
                                border: "1px solid #1e293b",
                                backgroundColor: "transparent",
                                color: "white",
                                fontSize: 13,
                                cursor: "pointer",
                            }}
                        >
                            {t.heroSecondary}
                        </button>
                    </div>
                </section>

                {/* Right hero card – How it works summary */}
                <section
                    id="how-it-works-card"
                    style={{
                        flex: "1 1 320px",
                        maxWidth: 430,
                        background:
                            "radial-gradient(circle at top left, #1e293b 0, #020617 55%, #020617 100%)",
                        borderRadius: 18,
                        border: "1px solid #1f2937",
                        padding: "18px 18px 16px",
                        boxShadow: "0 18px 45px rgba(15,23,42,0.85)",
                        marginRight: 94,
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            color: "#a3e635",
                            marginBottom: 6,
                        }}
                    >
                        {t.howTitle}
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            opacity: 0.9,
                            marginBottom: 12,
                        }}
                    >
                        {isSpanish
                            ? "Sube tu currículum, pega la descripción del puesto y deja que la IA haga la magia. Tu resultado: un PDF limpio, claro y enfocado en lo que el reclutador quiere ver."
                            : "Upload your resume, paste the job description, and let the AI do the rest. You get a clean, focused PDF that highlights what recruiters actually care about."}
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            rowGap: 10,
                            columnGap: 10,
                            fontSize: 12,
                        }}
                    >
            <span
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: "999px",
                    backgroundColor: "#22c55e33",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                }}
            >
              1
            </span>
                        <div>
                            <div style={{ fontWeight: 600 }}>{t.howStep1Title}</div>
                            <div style={{ opacity: 0.85 }}>{t.howStep1Desc}</div>
                        </div>

                        <span
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: "999px",
                                backgroundColor: "#22c55e33",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                            }}
                        >
              2
            </span>
                        <div>
                            <div style={{ fontWeight: 600 }}>{t.howStep2Title}</div>
                            <div style={{ opacity: 0.85 }}>{t.howStep2Desc}</div>
                        </div>

                        <span
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: "999px",
                                backgroundColor: "#22c55e33",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                            }}
                        >
              3
            </span>
                        <div>
                            <div style={{ fontWeight: 600 }}>{t.howStep3Title}</div>
                            <div style={{ opacity: 0.85 }}>{t.howStep3Desc}</div>
                        </div>
                    </div>
                </section>
            </main>

            {/* SECOND ROW: How it works + Plan box */}
            <section
                id="how-it-works-section"
                style={{
                    marginTop: 40,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 24,
                    alignItems: "stretch",
                }}
            >
                {/* Left: brief explanation */}
                <div
                    style={{
                        flex: "1 1 320px",
                        maxWidth: 520,
                        backgroundColor: "#020617",
                        borderRadius: 16,
                        border: "1px solid #111827",
                        padding: 16,
                    }}
                >
                    <h2 style={{ marginTop: 0, fontSize: 18 }}>{t.howTitle}</h2>
                    <p
                        style={{
                            fontSize: 13,
                            opacity: 0.85,
                            marginTop: 4,
                            marginBottom: 10,
                        }}
                    >
                        {isSpanish
                            ? "MindMyResume está diseñado para esas semanas intensas de búsqueda de trabajo. En lugar de pagar todos los meses, obtienes acceso completo durante 90 días, justo cuando más lo necesitas."
                            : "MindMyResume is built for those focused weeks of job hunting. Instead of paying every month, you get full access for 90 days—right when you need it most."}
                    </p>
                    <p
                        style={{
                            fontSize: 13,
                            opacity: 0.85,
                            margin: 0,
                        }}
                    >
                        {isSpanish
                            ? "En ese tiempo puedes ajustar tu currículum para distintos puestos, probar diferentes versiones y descargar PDFs profesionales listos para enviar a recruiters y plataformas como LinkedIn o Indeed."
                            : "During that time you can tailor your resume to different roles, test versions, and download professional PDFs ready for recruiters and job boards."}
                    </p>
                </div>

                {/* Right: Plan box */}
                <div
                    id="plan-section"
                    style={{
                        flex: "1 1 260px",
                        maxWidth: 360,
                        background:
                            "linear-gradient(145deg, #0f172a 0%, #022c22 40%, #0f172a 100%)",
                        borderRadius: 18,
                        border: "1px solid #16a34a55",
                        padding: 18,
                        boxShadow: "0 18px 40px rgba(22,163,74,0.35)",
                    }}
                >
                    <h2 style={{ marginTop: 0, fontSize: 17 }}>{t.planTitle}</h2>
                    <p
                        style={{
                            margin: "4px 0 8px 0",
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        {t.planPriceLine}
                    </p>

                    <ul
                        style={{
                            listStyle: "none",
                            padding: 0,
                            margin: "0 0 12px 0",
                            fontSize: 13,
                            opacity: 0.9,
                        }}
                    >
                        <li style={{ marginBottom: 6 }}>• {t.planLine1}</li>
                        <li style={{ marginBottom: 6 }}>• {t.planLine2}</li>
                        <li style={{ marginBottom: 6 }}>• {t.planLine3}</li>
                    </ul>

                    <button
                        type="button"
                        onClick={onGetStarted}
                        style={{
                            marginTop: 6,
                            width: "100%",
                            padding: "9px 14px",
                            borderRadius: "999px",
                            border: "none",
                            cursor: "pointer",
                            background:
                                "linear-gradient(135deg, #22c55e 0%, #2dd4bf 45%, #60a5fa 100%)",
                            color: "#020617",
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        {t.planCta}
                    </button>
                </div>
            </section>
        </div>
    );
}