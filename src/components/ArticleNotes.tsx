"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { UserNoteDto } from "@/types/notes";

export function ArticleNotes({ articleId }: { articleId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<UserNoteDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadNotes() {
    setLoading(true);
    return fetch(`/api/notes?articleId=${encodeURIComponent(articleId)}`)
      .then((res) => res.json())
      .then((data) => setNotes(data.notes ?? []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    // deferred to a microtask so this effect doesn't set state synchronously
    // during its own commit phase (see react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      loadNotes();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, body: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setNotes((prev) => [data.note, ...prev]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (authLoading) return null;

  return (
    <section className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">📝 マイメモ</h3>

      {!user ? (
        <p className="text-sm text-gray-500">
          ログインすると、この記事に自分用のメモ（面接対策の一言・気づきなど）を保存できます。
        </p>
      ) : (
        <>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="この記事についてのメモを書く..."
              rows={2}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="self-start rounded-lg brand-gradient px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {saving ? "保存中..." : "メモを追加"}
            </button>
          </form>

          {loading ? (
            <div className="skeleton h-10 w-full rounded" />
          ) : notes.length === 0 ? (
            <p className="text-xs text-gray-400">まだメモがありません。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2 text-sm text-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-line">{note.body}</p>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
