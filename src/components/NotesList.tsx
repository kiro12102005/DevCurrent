"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { UserNoteDto } from "@/types/notes";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";

export function NotesList({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<UserNoteDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function loadNotes() {
    setLoading(true);
    return fetch("/api/notes")
      .then((res) => res.json())
      .then((data) => setNotes(data.notes ?? []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      loadNotes();
    });
  }, [user]);

  async function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft.trim()) return;
    const res = await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editDraft }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? data.note : n)));
    }
    setEditingId(null);
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-2 px-4 pb-24 pt-16 md:pb-6 text-center">
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-gray-500 text-sm">マイメモを使うには右上からログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      <p className="text-xs text-gray-500">記事に残したメモの一覧です。タップすると元記事の要約に戻れます。</p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="skeleton h-4 w-1/3 rounded mb-2" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-400 text-sm">まだメモがありません。記事の要約画面から追加できます。</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 text-xs mb-1.5">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE_BADGE_CLASS[note.article.sourceType]}`}>
                  {SOURCE_LABEL[note.article.sourceType]}
                </span>
                {note.article.sourcePublishedAt && (
                  <span className="text-gray-500">{formatArticleDate(note.article.sourcePublishedAt)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectArticle(note.article.url)}
                className="block text-left font-semibold text-gray-800 hover:text-indigo-600 transition-colors mb-2"
              >
                {note.article.title ?? note.article.url}
              </button>

              {editingId === note.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(note.id)}
                      className="rounded-lg brand-gradient px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{note.body}</p>
                  <div className="flex gap-2 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditDraft(note.body);
                      }}
                      className="text-indigo-600 hover:underline"
                    >
                      編集
                    </button>
                    <button type="button" onClick={() => handleDelete(note.id)} className="text-gray-400 hover:text-red-600">
                      削除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
