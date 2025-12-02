// src/components/LanguageGate.jsx
import { useState } from "react";

const translations = {
    en: {
        heroTitle: "MindMyResume",
        heroSubtitle: "Your resume. Reimagined.",
        chooseLanguage: "Choose your language",
        english: "English",
        spanish: "Spanish",
        getStarted: "Get started",
    },
    es: {
        heroTitle: "MindMyResume",
        heroSubtitle: "Tu currículum. Reimaginado.",
        chooseLanguage: "Elige tu idioma",
        english: "Inglés",
        spanish: "Español",
        getStarted: "Comenzar",
    },
};

export default function LanguageGate({ onLanguageSelected }) {
    const [lang, setLang] = useState("en");
    const t = translations[lang];

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#020617",
                color: "white",
            }}
        >
            <div
                className="fade-in"
                style={{
                    backgroundColor: "#0f172a",
                    borderRadius: "24px",
                    padding: "32px",
                    width: "320px",
                    textAlign: "center",
                    boxShadow: "0 15px 30px rgba(0,0,0,0.6)",
                }}
            >
                <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
                    {t.heroTitle}
                </h1>
                <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "24px" }}>
                    {t.heroSubtitle}
                </p>

                <p style={{ fontWeight: 600, marginBottom: "12px" }}>{t.chooseLanguage}</p>

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                        marginBottom: "24px",
                    }}
                >
                    <button
                        onClick={() => setLang("en")}
                        style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            border: "none",
                            fontSize: "12px",
                            cursor: "pointer",
                            backgroundColor: lang === "en" ? "white" : "#1e293b",
                            color: lang === "en" ? "#020617" : "white",
                        }}
                    >
                        🇺🇸 {t.english}
                    </button>
                    <button
                        onClick={() => setLang("es")}
                        style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            border: "none",
                            fontSize: "12px",
                            cursor: "pointer",
                            backgroundColor: lang === "es" ? "white" : "#1e293b",
                            color: lang === "es" ? "#020617" : "white",
                        }}
                    >
                        🇲🇽 {t.spanish}
                    </button>
                </div>

                <button
                    onClick={() => onLanguageSelected(lang)}
                    style={{
                        width: "100%",
                        padding: "8px 0",
                        borderRadius: "999px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        backgroundColor: "#4ade80",
                        color: "#022c22",
                        fontSize: "14px",
                    }}
                >
                    {t.getStarted}
                </button>
            </div>
        </div>
    );
}
