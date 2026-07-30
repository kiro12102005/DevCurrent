"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { useT } from "@/lib/i18n/useT";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
    fetch("/api/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, stack: error.stack }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center py-16">
      <p className="text-5xl">⚠️</p>
      <h2 className="text-lg font-bold brand-gradient-text">{t.errorPage.title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{t.errorPage.description}</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white"
      >
        {t.errorPage.retryButton}
      </button>
    </div>
  );
}
