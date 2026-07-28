"use client";

import { useState } from "react";
import { FlaskConical, PlayCircle, Monitor, FileText } from "lucide-react";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import { downloadTextFile } from "@/lib/download";
import type { HandsOnResponse } from "@/types/handsOn";

// "読むだけ" で終わらせない: 記事を読んだ流れでそのまま最小構成のコードを生成し、
// 可能ならCodeSandboxで即座に開ける状態にする。BYOK生成なのでボタン押下トリガー式
// （ArticleNotes/InterviewPracticeと同じ、コストがかかる操作は自動実行しない）。
export function HandsOnGenerator({ articleId, articleTitle }: { articleId: string; articleTitle: string }) {
  const apiKey = useStoredApiKey();
  const [result, setResult] = useState<HandsOnResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hands-on/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました");
      setResult(data as HandsOnResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl bg-white shadow-sm border border-gray-200 p-5 print:hidden">
      <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
        <FlaskConical className="w-4 h-4" strokeWidth={2.25} /> 3分ハンズオン
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">
        この記事のテーマを、Geminiが生成する最小構成コードで実際に試せます。
      </p>

      {!result && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {loading ? "生成中..." : "ハンズオンコードを生成する"}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700">{result.code.description}</p>

          {result.sandboxUrl ? (
            <a
              href={result.sandboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white"
            >
              <PlayCircle className="w-4 h-4" strokeWidth={2.25} /> CodeSandboxで開く
            </a>
          ) : (
            <p className="flex items-start gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 leading-relaxed">
              <Monitor className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2.25} />
              ローカルでの実行方法: {result.code.runInstructions}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {result.code.files.map((f) => (
              <div key={f.path} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
                  <span className="text-xs font-mono text-gray-600">{f.path}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(f.content)}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    コピー
                  </button>
                </div>
                <pre className="text-xs text-gray-700 p-3 overflow-x-auto bg-white whitespace-pre">{f.content}</pre>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `${articleTitle}-handson.md`,
                  `# ${articleTitle} - ハンズオン\n\n${result.code.description}\n\n${result.code.files
                    .map((f) => `## ${f.path}\n\n\`\`\`\n${f.content}\n\`\`\``)
                    .join("\n\n")}\n\n## ローカル実行方法\n${result.code.runInstructions}\n`
                )
              }
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-[11px] font-semibold"
            >
              <FileText className="w-3 h-3" strokeWidth={2.25} /> MDでダウンロード
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
            >
              {loading ? "生成中..." : "作り直す"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
