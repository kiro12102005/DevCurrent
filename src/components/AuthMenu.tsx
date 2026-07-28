"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { TAG_OPTIONS, type Tag } from "@/lib/tags";

type Mode = "login" | "signup";

export function AuthMenu() {
  const { user, loading, refresh, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      await refresh();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-gray-300 pl-2.5 pr-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-indigo-300 transition-colors"
        >
          <span className="w-5 h-5 rounded-full brand-gradient text-white flex items-center justify-center text-[10px] font-bold">
            {user.email[0]?.toUpperCase()}
          </span>
          <span className="max-w-[8rem] truncate">{user.email}</span>
        </button>
        {open && (
          <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-2 sm:w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-xl shadow-indigo-900/10 z-20 max-h-[80vh] overflow-y-auto">
            <p className="px-1 text-xs text-gray-500 truncate">{user.email}</p>

            <PreferencesPanel />

            <button
              type="button"
              onClick={async () => {
                await logout();
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-900/20"
      >
        ログイン
      </button>
      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-2 sm:w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl shadow-indigo-900/10 z-20">
          <div className="flex gap-1 mb-3 rounded-lg bg-gray-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "login" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "signup" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="email"
              required
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              placeholder={mode === "signup" ? "パスワード（8文字以上）" : "パスワード"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-lg brand-gradient px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
            </button>
          </form>
          <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
            ログインすると記事へのメモ保存やアカウント単位でのプッシュ通知管理ができます（任意機能・未ログインでもフィード閲覧やURL要約は利用可能）。
          </p>
        </div>
      )}
    </div>
  );
}

function PreferencesPanel() {
  const [interestTags, setInterestTags] = useState<Tag[]>([]);
  const [wantsWeeklyDigest, setWantsWeeklyDigest] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/preferences")
        .then((res) => res.json())
        .then((data) => {
          setInterestTags(data.preferences?.interestTags ?? []);
          setWantsWeeklyDigest(data.preferences?.wantsWeeklyDigest ?? false);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    });
  }, []);

  function savePreferences(next: { interestTags?: Tag[]; wantsWeeklyDigest?: boolean }) {
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function toggleTag(tag: Tag) {
    const next = interestTags.includes(tag) ? interestTags.filter((t) => t !== tag) : [...interestTags, tag];
    setInterestTags(next);
    savePreferences({ interestTags: next });
  }

  function toggleDigest() {
    const next = !wantsWeeklyDigest;
    setWantsWeeklyDigest(next);
    savePreferences({ wantsWeeklyDigest: next });
  }

  if (!loaded) return <div className="skeleton h-16 w-full rounded-lg mt-3" />;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">興味のあるタグ</p>
      <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
        選ぶと、注目ピックアップのプッシュ通知がこのタグに関連する記事だけになります（未選択なら全件通知）。
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              interestTags.includes(tag) ? "brand-gradient text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
        <input type="checkbox" checked={wantsWeeklyDigest} onChange={toggleDigest} className="rounded" />
        週次ダイジェストメールを受け取る
      </label>
    </div>
  );
}
