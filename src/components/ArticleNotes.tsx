"use client";

import { useEffect, useState } from "react";
import { FileText, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { UserNoteDto } from "@/types/notes";
import { useT } from "@/lib/i18n/useT";

export function ArticleNotes({ articleId }: { articleId: string }) {
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const [notes, setNotes] = useState<UserNoteDto[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadNotes() {
    setLoading(true);
    return Promise.all([
      fetch(`/api/notes?articleId=${encodeURIComponent(articleId)}`).then((res) => res.json()),
      fetch(`/api/article-states?articleIds=${encodeURIComponent(articleId)}`).then((res) => res.json()),
    ])
      .then(([notesData, statesData]) => {
        setNotes(notesData.notes ?? []);
        setIsBookmarked(Boolean(statesData.states?.[articleId]?.isBookmarked));
      })
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

  async function handleToggleBookmark() {
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      await fetch(`/api/article-states/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBookmarked: next }),
      });
    } catch {
      setIsBookmarked(!next);
    }
  }

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
      if (!res.ok) throw new Error(data.error ?? t.common.saveFailedError);
      setNotes((prev) => [data.note, ...prev]);
      setIsBookmarked(true); // adding a note always bookmarks server-side too
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.saveFailedError);
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
    <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
          <FileText className="w-4 h-4" strokeWidth={2.25} /> {t.articleNotes.title}
        </h3>
        {user && (
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isBookmarked ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" strokeWidth={2.25} fill={isBookmarked ? "currentColor" : "none"} />
            {isBookmarked ? t.common.saved : t.common.save}
          </button>
        )}
      </div>

      {!user ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t.articleNotes.loginPrompt}</p>
      ) : (
        <>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.articleNotes.notePlaceholder}
              rows={2}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="self-start rounded-lg brand-gradient px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {saving ? t.common.saving : t.articleNotes.addNote}
            </button>
          </form>

          {loading ? (
            <div className="skeleton h-10 w-full rounded" />
          ) : notes.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.articleNotes.noNotesYet}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-line">{note.body}</p>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="shrink-0 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      {t.common.delete}
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
