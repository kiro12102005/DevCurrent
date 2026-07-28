"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Catches errors in the root layout itself (rare, but if it happens error.tsx
// can't help since it's also inside the layout tree) - must define its own
// html/body since it replaces the root layout entirely while active.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    fetch("/api/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, stack: error.stack }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="ja">
      <body style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem", padding: "1.5rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <p style={{ fontSize: "3rem", margin: 0 }}>⚠️</p>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>アプリの読み込みに失敗しました</h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: "20rem", margin: 0 }}>
          予期しないエラーが発生しました。もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg, #6d5bf5, #3730a3)",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          もう一度試す
        </button>
      </body>
    </html>
  );
}
