"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

export function SharePageSettings() {
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const t = useT();

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/share")
        .then((res) => res.json())
        .then((data) => {
          setShareSlug(data.share?.shareSlug ?? null);
          setNickname(data.share?.publicNickname ?? "");
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  async function handleToggle() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/share", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !shareSlug, publicNickname: nickname }),
      });
      const data = await res.json();
      setShareSlug(data.share?.shareSlug ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNickname() {
    setSaving(true);
    try {
      await fetch("/api/user/share", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: Boolean(shareSlug), publicNickname: nickname }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="skeleton h-32 w-full rounded-xl" />;

  const shareUrl = shareSlug && typeof window !== "undefined" ? `${window.location.origin}/u/${shareSlug}` : null;

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
        <Share2 className="w-4 h-4" strokeWidth={2.25} /> {t.sharePageSettings.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t.sharePageSettings.description}</p>

      <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
        {t.sharePageSettings.nicknameLabel}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onBlur={handleSaveNickname}
          maxLength={30}
          placeholder={t.sharePageSettings.nicknamePlaceholder}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
      </label>

      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className={`self-start rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
          shareSlug ? "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" : "brand-gradient text-white"
        }`}
      >
        {shareSlug ? t.sharePageSettings.unpublishButton : t.sharePageSettings.publishButton}
      </button>

      {shareUrl && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 break-all">
          {shareUrl}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            {t.common.copy}
          </button>
        </div>
      )}
    </div>
  );
}
