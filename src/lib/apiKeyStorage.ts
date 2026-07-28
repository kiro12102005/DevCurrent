import { useSyncExternalStore } from "react";

const STORAGE_KEY = "gemini_api_key";
const CHANGE_EVENT = "gemini-api-key-changed";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setStoredApiKey(apiKey: string): void {
  window.localStorage.setItem(STORAGE_KEY, apiKey.trim());
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearStoredApiKey(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getServerSnapshot(): string {
  return "";
}

// Reactively reflects the stored key, including changes made by other
// components (e.g. ApiKeySettings) via the CHANGE_EVENT.
export function useStoredApiKey(): string {
  return useSyncExternalStore(subscribe, getStoredApiKey, getServerSnapshot);
}
