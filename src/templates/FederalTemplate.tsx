// src/templates/FederalTemplate.tsx
import React from "react";

export function FederalTemplate({
                                    content,
                                    jobDescription,
                                }: {
    content: string;
    jobDescription?: string;
}) {
    // Split into lines, preserving basic structure
    const lines = content.split(/\r?\n/);

    return (
        <div
            style={{
                width: "100%",
                maxWidth: "800px",
                minHeight: "1050px",
                margin: "0 auto",
                padding: "32px 40px",
                backgroundColor: "#ffffff",
                color: "#111827",
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                fontSize: "11pt",
                boxSizing: "border-box",
            }}
        >
            {/* Header bar */}
            <div
                style={{
                    marginBottom: "16px",
                    paddingBottom: "8px",
                    borderBottom: "2px solid #e5e7eb",
                }}
            >
                <div
                    style={{
                        fontSize: "18pt",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                    }}
                >
                    {/* Try to treat the first non-empty line as name */}
                    {(() => {
                        const firstNonEmpty = lines.find((l) => l.trim().length > 0);
                        return firstNonEmpty || "";
                    })()}
                </div>

                <div
                    style={{
                        marginTop: "4px",
                        fontSize: "9pt",
                        color: "#4b5563",
                        lineHeight: 1.4,
                    }}
                >
                    {/* The next few lines often contain contact info */}
                    {lines
                        .slice(
                            lines.findIndex((l) => l.trim().length > 0) + 1,
                            lines.findIndex((l) =>
                                l.trim().toUpperCase().startsWith("PROFESSIONAL PROFILE")
                            ) !== -1
                                ? lines.findIndex((l) =>
                                    l.trim().toUpperCase().startsWith("PROFESSIONAL PROFILE")
                                )
                                : 6
                        )
                        .map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                </div>

                <div
                    style={{
                        marginTop: "6px",
                        fontSize: "8pt",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        color: "#1d4ed8",
                    }}
                >
                    FEDERAL RÉSUMÉ · USAJOBS STYLE
                </div>
            </div>

            {/* Optional job description / target role */}
            {jobDescription && jobDescription.trim() && (
                <div
                    style={{
                        marginBottom: "12px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        fontSize: "9pt",
                        color: "#1e3a8a",
                    }}
                >
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: "8pt",
                            letterSpacing: "0.08em",
                            marginBottom: "4px",
                        }}
                    >
                        TARGET POSITION / ANUNCIO DE USAJOBS
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                        {jobDescription}
                    </div>
                </div>
            )}

            {/* Main content */}
            <div
                style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.4,
                    fontSize: "10.5pt",
                }}
            >
                {content}
            </div>
        </div>
    );
}