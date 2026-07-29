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
  const [stackKeywords, setStackKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [wantsWeeklyDigest, setWantsWeeklyDigest] = useState(false);
  const [wantsFeaturedPush, setWantsFeaturedPush] = useState(true);
  const [wantsBreakingChangePush, setWantsBreakingChangePush] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/preferences")
        .then((res) => res.json())
        .then((data) => {
          setInterestTags(data.preferences?.interestTags ?? []);
          setStackKeywords(data.preferences?.stackKeywords ?? []);
          setWantsWeeklyDigest(data.preferences?.wantsWeeklyDigest ?? false);
          setWantsFeaturedPush(data.preferences?.wantsFeaturedPush ?? true);
          setWantsBreakingChangePush(data.preferences?.wantsBreakingChangePush ?? true);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    });
  }, []);

  function savePreferences(next: {
    interestTags?: Tag[];
    stackKeywords?: string[];
    wantsWeeklyDigest?: boolean;
    wantsFeaturedPush?: boolean;
    wantsBreakingChangePush?: boolean;
  }) {
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

  function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    const value = keywordDraft.trim();
    if (!value || stackKeywords.includes(value) || stackKeywords.length >= 15) return;
    const next = [...stackKeywords, value];
    setStackKeywords(next);
    setKeywordDraft("");
    savePreferences({ stackKeywords: next });
  }

  function removeKeyword(value: string) {
    const next = stackKeywords.filter((k) => k !== value);
    setStackKeywords(next);
    savePreferences({ stackKeywords: next });
  }

  function toggleDigest() {
    const next = !wantsWeeklyDigest;
    setWantsWeeklyDigest(next);
    savePreferences({ wantsWeeklyDigest: next });
  }

  function toggleFeaturedPush() {
    const next = !wantsFeaturedPush;
    setWantsFeaturedPush(next);
    savePreferences({ wantsFeaturedPush: next });
  }

  function toggleBreakingChangePush() {
    const next = !wantsBreakingChangePush;
    setWantsBreakingChangePush(next);
    savePreferences({ wantsBreakingChangePush: next });
  }

  if (!loaded) return <div className="skeleton h-16 w-full rounded-lg mt-3" />;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">通知の種類</p>
      <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
        プッシュ通知を種類ごとに個別にON/OFFできます（🔔通知ボタン自体をONにしている場合のみ届きます）。
      </p>
      <div className="flex flex-col gap-1.5 mb-3">
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input type="checkbox" checked={wantsFeaturedPush} onChange={toggleFeaturedPush} className="rounded" />
          注目ピックアップ通知
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input type="checkbox" checked={wantsBreakingChangePush} onChange={toggleBreakingChangePush} className="rounded" />
          🚨 動かなくなる変更の通知（興味タグ・技術スタックの設定に関わらず届きます）
        </label>
      </div>

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

      <p className="text-xs font-semibold text-gray-700 mb-1.5">気になる技術スタック（自由入力）</p>
      <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
        例: React, PyTorch, Rust。記事タイトルにこの単語が含まれると通知対象になります（上のタグと合わせてOR条件）。
      </p>
      {stackKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {stackKeywords.map((kw) => (
            <span key={kw} className="flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-[11px] font-semibold">
              {kw}
              <button type="button" onClick={() => removeKeyword(kw)} className="text-indigo-400 hover:text-indigo-700">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <form onSubmit={addKeyword} className="flex gap-1.5 mb-3">
        <input
          type="text"
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          placeholder="技術名を追加"
          maxLength={40}
          className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-xs font-semibold">
          追加
        </button>
      </form>

      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
        <input type="checkbox" checked={wantsWeeklyDigest} onChange={toggleDigest} className="rounded" />
        週次ダイジェストメールを受け取る
      </label>
    </div>
  );
}
