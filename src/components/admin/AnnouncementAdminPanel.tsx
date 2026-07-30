"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Announcement } from "@/lib/announcements";

// Operator-only tool (gated by the server page this renders inside), so this
// stays plain Japanese rather than running through the i18n dictionary that
// covers the rest of the (multi-language) end-user-facing app.
export function AnnouncementAdminPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => setAnnouncements(data.announcements ?? []))
      .catch(() => setAnnouncements([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "投稿に失敗しました");
      setTitle("");
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/announcements/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col gap-2"
      >
        <input
          type="text"
          required
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        <textarea
          required
          placeholder="本文"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          rows={4}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !title.trim() || !body.trim()}
          className="self-start rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {busy ? "公開中..." : "公開する（全員にプッシュ通知）"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">公開済み</h2>
        {announcements === null ? (
          <div className="skeleton h-20 w-full rounded-lg" />
        ) : announcements.length === 0 ? (
          <p className="text-sm text-gray-400">まだお知らせがありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{new Date(a.createdAt).toLocaleString("ja-JP")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label="削除"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
