"use client";

/**
 * Root error UI — required for Next App Router client recovery.
 * Keeps the bundler from failing when the builtin global-error module is missing.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1220",
          color: "#e8eefc",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Etwas ist schiefgelaufen</h1>
          <p style={{ opacity: 0.75, marginBottom: 20, fontSize: 14 }}>
            {error?.message || "Unerwarteter Fehler"}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "10px 16px",
              background: "#3b82f6",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
