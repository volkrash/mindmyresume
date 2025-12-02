// src/App.jsx
import { useState } from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import outputs from "../amplify_outputs.json";

import Dashboard from "./components/Dashboard";
import Landing from "./components/Landing";
import LanguageGate from "./components/LanguageGate"; // ⬅️ make sure this file exists

import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

function App() {
    const [lang, setLang] = useState(null);      // ✅ plain JS
    const [showBuilder, setShowBuilder] = useState(false);

    // STEP 1: Language selection
    if (!lang) {
        return <LanguageGate onLanguageSelected={setLang} />;
    }

    // STEP 2: Landing / marketing page
    if (!showBuilder) {
        return (
            <Landing
                lang={lang}
                onChangeLang={setLang}
                onGetStarted={() => setShowBuilder(true)}
            />
        );
    }

    // STEP 3: Auth + Dashboard
    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#020617",
            }}
        >
            <div
                className="fade-in"
                style={{
                    maxWidth: "960px",
                    width: "100%",
                    display: "flex",
                    gap: "32px",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {/* Logo / brand header (top-left) */}
                <header
                    style={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: "999px",
                            background:
                                "linear-gradient(135deg, #22c55e 0%, #2dd4bf 50%, #60a5fa 100%)",
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>MindMyResume</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                            {lang === "es"
                                ? "Tu currículum. Reimaginado."
                                : "Your resume. Reimagined."}
                        </div>
                    </div>
                </header>

                {/* Auth + Dashboard */}
                <div
                    style={{
                        flex: 1,
                        minWidth: "320px",
                        maxWidth: "420px",
                    }}
                >
                    <Authenticator
                        components={{
                            Header() {
                                return (
                                    <div style={{ textAlign: "center", marginBottom: "8px" }}>
                                        <h2 style={{ margin: 0, fontSize: "20px" }}>
                                            {lang === "es" ? "Bienvenido de nuevo" : "Welcome back"}
                                        </h2>
                                        <p style={{ margin: 0, fontSize: "12px", opacity: 0.7 }}>
                                            {lang === "es"
                                                ? "Inicia sesión o crea una cuenta para guardar tus currículums por 2 años."
                                                : "Sign in or create an account to save your resumes for 2 years."}
                                        </p>
                                    </div>
                                );
                            },
                        }}
                    >
                        {({ signOut, user }) => (
                            <Dashboard lang={lang} user={user} onSignOut={signOut} />
                        )}
                    </Authenticator>
                </div>
            </div>
        </div>
    );
}

export default App;
