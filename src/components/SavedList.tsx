"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { SavedItem } from "@/types/saved";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";

// Unified "保存済み" tab: bookmarked articles, each with any notes attached.
// Bookmarking (from a feed card) and note-taking (from the article detail
// view) both funnel into this one list now - see POST /api/notes, which
// bookmarks automatically when a note is created.
export function SavedList({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function loadSaved() {
    setLoading(true);
    return fetch("/api/saved")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      loadSaved();
    });
  }, [user]);

  async function handleUnsave(articleId: string) {
    setItems((prev) => prev.filter((i) => i.article.id !== articleId));
    await fetch(`/api/article-states/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBookmarked: false }),
    }).catch(() => {});
  }

  async function handleAddNote(articleId: string) {
    if (!draft.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, body: draft }),
    }).catch(() => null);
    if (res?.ok) {
      setDraft("");
      setDraftFor(null);
      await loadSaved();
    }
  }

  async function handleDeleteNote(noteId: string, articleId: string) {
    setItems((prev) =>
      prev.map((i) => (i.article.id === articleId ? { ...i, notes: i.notes.filter((n) => n.id !== noteId) } : i))
    );
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" }).catch(() => {});
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-2 px-4 pb-24 pt-16 md:pb-6 text-center">
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-gray-500 text-sm">保存済み記事を使うには右上からログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      <p className="text-xs text-gray-500">
        フィードで🔖保存した記事、またはメモを書いた記事がここにまとまります。
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="skeleton h-4 w-1/3 rounded mb-2" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔖</p>
          <p className="text-gray-400 text-sm">まだ保存した記事がありません。フィードの🔖ボタンから保存できます。</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ article, notes }) => (
            <li key={article.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 text-xs mb-1.5">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE_BADGE_CLASS[article.sourceType]}`}>
                  {SOURCE_LABEL[article.sourceType]}
                </span>
                {article.sourcePublishedAt && (
                  <span className="text-gray-500">{formatArticleDate(article.sourcePublishedAt)}</span>
                )}
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => onSelectArticle(article.url)}
                  className="text-left font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
                >
                  {article.title ?? article.url}
                </button>
                <button
                  type="button"
                  onClick={() => handleUnsave(article.id)}
                  className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                >
                  保存解除
                </button>
              </div>

              {notes.length > 0 && (
                <ul className="flex flex-col gap-1.5 mb-2">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2 text-sm text-gray-700">
                      <div className="flex items-start justify-between gap-2">
                        <p className="whitespace-pre-line">{note.body}</p>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id, article.id)}
                          className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {draftFor === article.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="メモを書く..."
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddNote(article.id)}
                      className="rounded-lg brand-gradient px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftFor(null);
                        setDraft("");
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftFor(article.id);
                    setDraft("");
                  }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  + メモを追加
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
