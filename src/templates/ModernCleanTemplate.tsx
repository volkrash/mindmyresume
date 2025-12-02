// src/templates/ModernCleanTemplate.tsx
import React from "react";

type ModernCleanTemplateProps = {
    content: string;
    jobDescription?: string;
};

export const ModernCleanTemplate: React.FC<ModernCleanTemplateProps> = ({
                                                                            content,
                                                                            jobDescription,
                                                                        }) => {
    // Very simple parsing:
    // - First non-empty line = Name
    // - Second non-empty line = Title
    // - Rest = body text
    const lines = content
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.trim().length > 0);

    const nameLine = lines[0] || "Your Name";
    const titleLine = lines[1] || "Professional Title";
    const bodyLines = lines.slice(2);
    const bodyText = bodyLines.join("\n") || "Add your experience, skills, and education here.";

    return (
        <div
            style={{
                width: "800px",
                minHeight: "1040px",
                margin: "0 auto",
                backgroundColor: "#ffffff",
                color: "#111827",
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, system-ui, Segoe UI, sans-serif",
                padding: "40px 52px",
                boxSizing: "border-box",
                boxShadow: "0 18px 45px rgba(15,23,42,0.22)",
                borderRadius: "12px",
            }}
        >
            {/* Header */}
            <header
                style={{
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: "18px",
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: "16px",
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: "28px",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                        }}
                    >
                        {nameLine}
                    </h1>
                    <p
                        style={{
                            margin: "6px 0 0",
                            fontSize: "13px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#6b7280",
                        }}
                    >
                        {titleLine}
                    </p>
                </div>

                {jobDescription && jobDescription.trim() && (
                    <div
                        style={{
                            maxWidth: "260px",
                            fontSize: "10px",
                            color: "#4b5563",
                            textAlign: "right",
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 600,
                                fontSize: "11px",
                                marginBottom: "4px",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                            }}
                        >
                            Target role
                        </div>
                        <div
                            style={{
                                padding: "6px 8px",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                backgroundColor: "#f9fafb",
                                maxHeight: "84px",
                                overflow: "hidden",
                            }}
                        >
                            {jobDescription}
                        </div>
                    </div>
                )}
            </header>

            {/* Body */}
            <main>
                {/* Simple single-column layout for now – clean and ATS friendly */}
                <section
                    style={{
                        marginBottom: "14px",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: "11px",
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "#6b7280",
                        }}
                    >
                        Professional Profile
                    </h2>
                </section>

                <section>
          <pre
              style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: "11.5px",
                  lineHeight: 1.6,
                  margin: 0,
                  color: "#111827",
              }}
          >
            {bodyText}
          </pre>
                </section>
            </main>
        </div>
    );
};
