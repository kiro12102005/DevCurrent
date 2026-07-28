"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";

export function SharePageSettings() {
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
      <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
        <Share2 className="w-4 h-4" strokeWidth={2.25} /> 共有可能な学習実績ページ
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed">
        公開すると、既読/保存件数や分野別の学習マップを誰でも見られる専用ページができます。メールアドレスなど個人情報は表示されません。履歴書や就活サイトへのリンクにどうぞ。
      </p>

      <label className="flex flex-col gap-1 text-xs text-gray-600">
        表示名（任意・空欄なら「ユーザー」と表示）
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onBlur={handleSaveNickname}
          maxLength={30}
          placeholder="例: taro_dev"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>

      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className={`self-start rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
          shareSlug ? "border border-gray-300 text-gray-700 hover:bg-gray-50" : "brand-gradient text-white"
        }`}
      >
        {shareSlug ? "公開を停止する" : "公開する"}
      </button>

      {shareUrl && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 break-all">
          {shareUrl}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="ml-2 text-indigo-600 hover:underline shrink-0"
          >
            コピー
          </button>
        </div>
      )}
    </div>
  );
}
