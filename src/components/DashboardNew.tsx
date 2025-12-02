<main
    className="fade-in"
    style={{
        display: "flex",
        gap: "24px",
        alignItems: "flex-start",
    }}
>
    {/* LEFT COLUMN – sidebar */}
    <div
        style={{
            width: "320px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
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
            <p style={{ marginTop: "8px", fontSize: "11px", color: "#f97316" }}>
                {isSpanish
                    ? "Completa el pago para habilitar la creación."
                    : "Complete payment to enable creation."}
            </p>
        )}
    </section>

    <section
        style={{
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
                    const expiresMs = r.expiresAt ? new Date(r.expiresAt).getTime() : 0;
                    const daysLeft =
                        expiresMs <= now
                            ? 0
                            : Math.floor((expiresMs - now) / (1000 * 60 * 60 * 24));

                    const isActive = activeResume && activeResume.id === r.id;

                    return (
                        <tr
                            key={r.id}
                            style={{
                                borderBottom: "1px solid #1e293b",
                                backgroundColor: isActive ? "#020617" : "transparent",
                            }}
                        >
                            <td style={{ padding: "6px" }}>{r.title}</td>
                            <td style={{ padding: "6px", textTransform: "uppercase" }}>
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

    {/* RIGHT COLUMN – big editor */}
    <div
        style={{
            flex: "1 1 auto",
            minWidth: 0, // helps prevent overflow
        }}
    >
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
            }}
        >
            <h2 style={{ marginTop: 0, fontSize: "16px" }}>{t.editorTitle}</h2>
            <button
                onClick={handleDownloadPdf}
                style={{
                    padding: "4px 10px",
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

                {/* Upload resume file */}
                <label
                    style={{
                        fontSize: "12px",
                        opacity: 0.85,
                        display: "block",
                        marginBottom: "4px",
                    }}
                >
                    {t.uploadLabel}
                </label>
                <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{
                        marginBottom: "6px",
                        fontSize: "11px",
                    }}
                />
                <p
                    style={{
                        marginTop: 0,
                        marginBottom: "8px",
                        fontSize: "11px",
                        opacity: 0.7,
                    }}
                >
                    {t.uploadHint}
                </p>

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
                        minHeight: "220px",           // ⬅️ shorter default
                        maxHeight: "500px",           // ⬅️ don’t take the whole screen
                        resize: "vertical",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #1e293b",
                        backgroundColor: "#020617",
                        color: "white",
                        fontSize: "13px",
                        fontFamily: "monospace",
                        marginBottom: "8px",
                    }}
                />

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
                        width: "100%",
                        minHeight: "260px",
                        resize: "vertical",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #1e293b",
                        backgroundColor: "#020617",
                        color: "white",
                        fontSize: "13px",
                        fontFamily: "monospace",
                        marginBottom: "8px",
                    }}
                />

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                        marginTop: "4px",
                        alignItems: "center",
                        paddingTop: "8px",
                        borderTop: "1px solid #1e293b",   // visual separation
                    }}
                >

                    <button
                        onClick={handleRewriteWithAI}
                        disabled={aiLoading || !hasPaid || rewriteCredits <= 0}
                        style={{
                            flex: 1,
                            padding: "8px 12px",            // a bit bigger
                            borderRadius: "999px",
                            border: "none",
                            cursor: aiLoading ? "wait" : "pointer",
                            backgroundColor:
                                hasPaid && rewriteCredits > 0 ? "#6366f1" : "#4b5563",
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
                            padding: "8px 14px",
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
            </>
        ) : (
            <p style={{ fontSize: "13px", opacity: 0.8 }}>
                {isSpanish
                    ? "Selecciona un currículum de la lista para editarlo."
                    : "Select a resume from the list to edit it."}
            </p>
        )}
    </section>
    </div>
</main>
