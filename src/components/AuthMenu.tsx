"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { openSettingsPanel } from "@/lib/settingsPanel";
import { useT } from "@/lib/i18n/useT";

type Mode = "login" | "signup";

export function AuthMenu() {
  const { user, loading, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

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
      if (!res.ok) throw new Error(data.error ?? t.common.genericError);
      await refresh();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  // Account preferences (notification types, interest tags, tech stack,
  // weekly digest) and logout now live in Settings > Account, alongside the
  // rest of the app's options - this badge is just a quick shortcut there
  // rather than its own dropdown.
  if (user) {
    return (
      <button
        type="button"
        onClick={() => openSettingsPanel("account")}
        className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 pl-2.5 pr-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
      >
        <span className="w-5 h-5 rounded-full brand-gradient text-white flex items-center justify-center text-[10px] font-bold">
          {user.email[0]?.toUpperCase()}
        </span>
        <span className="max-w-[4.5rem] sm:max-w-[8rem] truncate">{user.email}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-900/20"
      >
        {t.authMenu.login}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-2 sm:w-72 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl shadow-indigo-900/10 z-20">
          <div className="flex gap-1 mb-3 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "login" ? "bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
            >
              {t.authMenu.login}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "signup" ? "bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
            >
              {t.authMenu.signup}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="email"
              required
              placeholder={t.authMenu.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              placeholder={mode === "signup" ? t.authMenu.passwordPlaceholderSignup : t.authMenu.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-lg brand-gradient px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? t.common.processing : mode === "login" ? t.authMenu.login : t.authMenu.registerButton}
            </button>
          </form>
          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">{t.authMenu.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
