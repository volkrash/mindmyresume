// src/templates/ModernCleanTemplate.tsx
import React from "react";

type Props = {
    content: string;
    jobDescription?: string;
};

export const ModernCleanTemplate: React.FC<Props> = ({
                                                         content,
                                                         jobDescription,
                                                     }) => {
    // Normalize line endings
    const normalized = (content || "").replace(/\r\n/g, "\n");

    const allLines = normalized.split("\n");
    const nonEmpty = allLines.filter((l) => l.trim() !== "");

    const nameLine = nonEmpty[0] || "";
    const titleLine = nonEmpty[1] || "";

    // Body = everything after the first 2 lines, but we keep original line breaks
    const bodyText = allLines.slice(2).join("\n");

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 800,
                minHeight: 600,
                margin: "0 auto",
                padding: "32px 40px",
                backgroundColor: "#ffffff",
                color: "#111827",
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                fontSize: 12,
                boxSizing: "border-box",
                borderRadius: 12,
            }}
        >
            {/* Header */}
            <div
                style={{
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: 8,
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 24,
                }}
            >
                <div>
                    {nameLine && (
                        <h1
                            style={{
                                margin: 0,
                                fontSize: 20,
                                letterSpacing: 0.03,
                                fontWeight: 700,
                            }}
                        >
                            {nameLine}
                        </h1>
                    )}
                    {titleLine && (
                        <p
                            style={{
                                margin: "4px 0 0 0",
                                fontSize: 11,
                                color: "#6b7280",
                            }}
                        >
                            {titleLine}
                        </p>
                    )}
                </div>

                {jobDescription && jobDescription.trim() && (
                    <div
                        style={{
                            maxWidth: 260,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            backgroundColor: "#f9fafb",
                            fontSize: 10,
                            color: "#4b5563",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                marginBottom: 4,
                                letterSpacing: 0.04,
                                textTransform: "uppercase",
                                color: "#6b7280",
                            }}
                        >
                            Target role
                        </div>
                        <div
                            style={{
                                whiteSpace: "pre-line",
                                lineHeight: 1.4,
                            }}
                        >
                            {jobDescription}
                        </div>
                    </div>
                )}
            </div>

            {/* Body – this is where spacing matters */}
            <div
                style={{
                    whiteSpace: "pre-line", // <-- preserves \n and blank lines
                    lineHeight: 1.5,
                    fontSize: 11.5,
                }}
            >
                {bodyText || normalized}
            </div>
        </div>
    );
};
