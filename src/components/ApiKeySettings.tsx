"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { clearStoredApiKey, maskApiKey, setStoredApiKey, useStoredApiKey } from "@/lib/apiKeyStorage";
import { useT } from "@/lib/i18n/useT";

export function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const savedKey = useStoredApiKey();
  const [input, setInput] = useState("");
  const t = useT();

  function handleSave() {
    if (!input.trim()) return;
    setStoredApiKey(input);
    setInput("");
    setOpen(false);
  }

  function handleClear() {
    clearStoredApiKey();
    setInput("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.apiKeySettings.toggleLabel}
        className="flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-700 px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" strokeWidth={2.25} /> <span className="hidden sm:inline">{t.apiKeySettings.toggleLabel}</span>
        {savedKey && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-2 sm:w-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl shadow-indigo-900/10 z-20">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.apiKeySettings.panelTitle}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t.apiKeySettings.description}</p>

          {savedKey ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
              <span className="font-mono text-gray-700 dark:text-gray-300">{maskApiKey(savedKey)}</span>
              <button type="button" onClick={handleClear} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                {t.common.delete}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{t.apiKeySettings.notRegistered}</p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <input
              type="password"
              placeholder={t.apiKeySettings.inputPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!input.trim()}
              className="rounded-lg brand-gradient px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            >
              {t.apiKeySettings.saveButton}
            </button>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t.apiKeySettings.getKeyLink}
          </a>
        </div>
      )}
    </div>
  );
}
