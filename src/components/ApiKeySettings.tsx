"use client";

import { useState } from "react";
import { clearStoredApiKey, maskApiKey, setStoredApiKey, useStoredApiKey } from "@/lib/apiKeyStorage";

export function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const savedKey = useStoredApiKey();
  const [input, setInput] = useState("");

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
        className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-indigo-300 transition-colors"
      >
        ⚙️ APIキー設定
        {savedKey && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xl shadow-indigo-900/10 z-20">
          <p className="text-sm font-semibold text-gray-800">あなたのGemini APIキー</p>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            このアプリはみんなで1つのAPIキーを共有せず、各自のキーで生成します。
            キーはこの端末のブラウザ内にのみ保存され、サーバーのデータベースには保存されません。
          </p>

          {savedKey ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="font-mono text-gray-700">{maskApiKey(savedKey)}</span>
              <button type="button" onClick={handleClear} className="text-xs text-red-600 hover:underline">
                削除
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-600">まだAPIキーが登録されていません</p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <input
              type="password"
              placeholder="AIza..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!input.trim()}
              className="rounded-lg brand-gradient px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            >
              保存する
            </button>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center text-xs text-indigo-600 hover:underline"
          >
            無料でAPIキーを発行する（Google AI Studio）
          </a>
        </div>
      )}
    </div>
  );
}
