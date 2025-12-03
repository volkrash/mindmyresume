// src/App.jsx
import { useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import outputs from "../amplify_outputs.json";
import Dashboard from "./components/Dashboard";
import Landing from "./components/Landing";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

// Keys for localStorage
const LANG_KEY = "mmr_lang";
const SHOW_APP_KEY = "mmr_show_app";

function App() {
    // Initialize from localStorage if present
    const [lang, setLang] = useState("en");
    const [showApp, setShowApp] = useState(false);

    // On first load, restore language + view from localStorage
    useEffect(() => {
        try {
            const storedLang = window.localStorage.getItem(LANG_KEY);
            if (storedLang === "en" || storedLang === "es") {
                setLang(storedLang);
            }

            const storedShowApp = window.localStorage.getItem(SHOW_APP_KEY);
            if (storedShowApp === "true") {
                setShowApp(true);
            }
        } catch (e) {
            console.warn("Error reading localStorage", e);
        }
    }, []);

    const handleLanguageChange = (newLang) => {
        setLang(newLang);
        try {
            window.localStorage.setItem(LANG_KEY, newLang);
        } catch (e) {
            console.warn("Error writing lang to localStorage", e);
        }
    };

    const handleGetStarted = () => {
        setShowApp(true);
        try {
            window.localStorage.setItem(SHOW_APP_KEY, "true");
        } catch (e) {
            console.warn("Error writing showApp to localStorage", e);
        }
    };

    const handleBackToLanding = () => {
        setShowApp(false);
        try {
            window.localStorage.setItem(SHOW_APP_KEY, "false");
        } catch (e) {
            console.warn("Error writing showApp to localStorage", e);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100vw",
                backgroundColor: "#020617",
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "1100px",
                    margin: "0 auto",
                    padding: "24px 16px 40px",
                    boxSizing: "border-box",
                }}
            >
                {!showApp ? (
                    // 👉 Public landing
                    <Landing
                        lang={lang}
                        onLanguageChange={handleLanguageChange}
                        onGetStarted={handleGetStarted}
                    />
                ) : (
                    // 👉 Auth + Dashboard
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "40px",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                maxWidth: "960px",
                            }}
                        >
                            <Authenticator
                                components={{
                                    Header() {
                                        return (
                                            <div
                                                style={{
                                                    textAlign: "center",
                                                    marginBottom: "8px",
                                                }}
                                            >
                                                <h2 style={{ margin: 0, fontSize: "20px" }}>
                                                    {lang === "es" ? "Bienvenido de nuevo" : "Welcome back"}
                                                </h2>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontSize: "12px",
                                                        opacity: 0.7,
                                                    }}
                                                >
                                                    {lang === "es"
                                                        ? "Inicia sesión o crea una cuenta para guardar tus currículums durante 2 años."
                                                        : "Sign in or create an account to save your resumes for 2 years."}
                                                </p>
                                            </div>
                                        );
                                    },
                                }}
                            >
                                {({ signOut, user }) => (
                                    <>
                                        {/* 🔙 Back to landing link + language toggle */}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "8px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={handleBackToLanding}
                                                style={{
                                                    border: "none",
                                                    background: "transparent",
                                                    color: "#e5e7eb",
                                                    cursor: "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    padding: 0,
                                                }}
                                            >
                                                <span style={{ fontSize: "14px" }}>←</span>
                                                {lang === "es"
                                                    ? "Volver a la página principal"
                                                    : "Back to landing page"}
                                            </button>

                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLanguageChange("en")}
                                                    style={{
                                                        padding: "4px 8px",
                                                        fontSize: "11px",
                                                        borderRadius: "999px",
                                                        border:
                                                            lang === "en"
                                                                ? "1px solid #22c55e"
                                                                : "1px solid #374151",
                                                        backgroundColor:
                                                            lang === "en" ? "#022c22" : "transparent",
                                                        color: "#e5e7eb",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    EN
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLanguageChange("es")}
                                                    style={{
                                                        padding: "4px 8px",
                                                        fontSize: "11px",
                                                        borderRadius: "999px",
                                                        border:
                                                            lang === "es"
                                                                ? "1px solid #22c55e"
                                                                : "1px solid #374151",
                                                        backgroundColor:
                                                            lang === "es" ? "#022c22" : "transparent",
                                                        color: "#e5e7eb",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    ES
                                                </button>
                                            </div>
                                        </div>

                                        <Dashboard lang={lang} user={user} onSignOut={signOut} />
                                    </>
                                )}
                            </Authenticator>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;