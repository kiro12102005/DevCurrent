import { useSyncExternalStore } from "react";

export type Language = "ja" | "en" | "zh";

const LANGUAGE_STORAGE_KEY = "app_language";
const CHANGE_EVENT = "app-language-changed";
const DEFAULT_LANGUAGE: Language = "ja";

function isLanguage(value: string | null): value is Language {
  return value === "ja" || value === "en" || value === "zh";
}

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

export function setStoredLanguage(lang: Language): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

// Client-only preference (no cookie/SSR locale routing - deliberately out of
// scope, matches the on-demand/client-side i18n architecture used for AI
// content translation too). One consequence: an EN/ZH returning visitor sees
// one brief flash of Japanese UI text before this snapshot syncs post-hydration
// - same category of limitation apiKeyStorage.ts already has for the BYOK key,
// not worth a dark-mode-style inline anti-flash script (that needs real SSR
// locale support).
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getStoredLanguage, getServerSnapshot);
}
