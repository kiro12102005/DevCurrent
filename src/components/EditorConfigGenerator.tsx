"use client";

import { useState } from "react";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import { downloadTextFile } from "@/lib/download";
import type { EditorConfigFileDto } from "@/types/editorConfig";

const TOOL_ICON: Record<EditorConfigFileDto["tool"], string> = {
  claude_code: "🤖",
  cursor: "▶️",
  generic: "💬",
};

// Turns "この記事のテーマ" into a ready-to-drop-in instructions file for the
// AI coding tools this app's own users are likely already using day to day
// (Claude Code / Cursor / any chat-based assistant). BYOK, button-triggered -
// same cost pattern as HandsOnGenerator.
export function EditorConfigGenerator({ articleId }: { articleId: string }) {
  const apiKey = useStoredApiKey();
  const [files, setFiles] = useState<EditorConfigFileDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/editor-config/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました");
      setFiles(data.files as EditorConfigFileDto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl bg-white shadow-sm border border-gray-200 p-5 print:hidden">
      <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">⚙️ AIエディタ設定を生成</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">
        この記事の内容をもとに、Claude Code / Cursor / 汎用チャット用の指示ファイルをそのまま貼り付けられる形式で生成します。
      </p>

      {!files && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {loading ? "生成中..." : "設定ファイルを生成する"}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {files && (
        <div className="flex flex-col gap-3">
          {files.map((f) => (
            <div key={f.tool} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-700">
                  {TOOL_ICON[f.tool]} {f.label} <span className="font-mono text-gray-400">({f.filename})</span>
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(f.content)}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    コピー
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextFile(f.filename, f.content)}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    保存
                  </button>
                </div>
              </div>
              <pre className="text-xs text-gray-700 p-3 overflow-x-auto bg-white whitespace-pre-wrap max-h-64 overflow-y-auto">{f.content}</pre>
            </div>
          ))}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="self-start rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
          >
            {loading ? "生成中..." : "作り直す"}
          </button>
        </div>
      )}
    </section>
  );
}
