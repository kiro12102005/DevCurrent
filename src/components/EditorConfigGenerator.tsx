"use client";

import { useState } from "react";
import { Settings, Bot, Code2, MessageSquare } from "lucide-react";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import { downloadTextFile } from "@/lib/download";
import type { EditorConfigFileDto } from "@/types/editorConfig";
import { useT } from "@/lib/i18n/useT";

const TOOL_ICON: Record<EditorConfigFileDto["tool"], typeof Bot> = {
  claude_code: Bot,
  cursor: Code2,
  generic: MessageSquare,
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
  const t = useT();

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
      if (!res.ok) throw new Error(data.error ?? t.common.generationFailedError);
      setFiles(data.files as EditorConfigFileDto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.generationFailedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5 print:hidden">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
        <Settings className="w-4 h-4" strokeWidth={2.25} /> {t.editorConfigGenerator.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{t.editorConfigGenerator.description}</p>

      {!files && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {loading ? t.common.generating : t.editorConfigGenerator.generateButton}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {files && (
        <div className="flex flex-col gap-3">
          {files.map((f) => {
            const ToolIcon = TOOL_ICON[f.tool];
            return (
            <div key={f.tool} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <ToolIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                  {f.label} <span className="font-mono text-gray-400 dark:text-gray-500">({f.filename})</span>
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(f.content)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t.common.copy}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextFile(f.filename, f.content)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t.common.save}
                  </button>
                </div>
              </div>
              <pre className="text-xs text-gray-700 dark:text-gray-300 p-3 overflow-x-auto bg-white dark:bg-gray-900 whitespace-pre-wrap max-h-64 overflow-y-auto">{f.content}</pre>
            </div>
            );
          })}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="self-start rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
          >
            {loading ? t.common.generating : t.common.regenerate}
          </button>
        </div>
      )}
    </section>
  );
}
