"use client";

import { useEffect, useRef, useState } from "react";
import type { SummarizeResponse } from "@/types/insight";
import { GlossaryTerm } from "./GlossaryTerm";
import { ArticleNotes } from "./ArticleNotes";
import { GithubRepoCard } from "./GithubRepoCard";
import { HandsOnGenerator } from "./HandsOnGenerator";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";
import { countryFlag } from "@/lib/countryLabels";
import { downloadTextFile } from "@/lib/download";
import { articleInsightToMarkdown } from "@/lib/exportMarkdown";

// externalRequest.token must change (e.g. Date.now() at click time) even if the
// same URL is picked twice in a row, so the effect below re-triggers reliably.
export function UrlSummarizer({ externalRequest }: { externalRequest?: { url: string; token: number } }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const apiKey = useStoredApiKey();
  // guards against React Strict Mode's dev-only double effect invocation
  // firing the same request twice (wastes a Gemini call and can race the DB)
  const lastRequestedToken = useRef<number | null>(null);

  async function runSummarize(targetUrl: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "エラーが発生しました");
      }
      setResult(data as SummarizeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!externalRequest) return;
    if (lastRequestedToken.current === externalRequest.token) return;
    lastRequestedToken.current = externalRequest.token;
    const targetUrl = externalRequest.url;
    // deferred to a microtask so this effect doesn't set state synchronously
    // during its own commit phase (see react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      setUrl(targetUrl);
      runSummarize(targetUrl);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRequest?.token]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSummarize(url);
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 px-4 pb-24 pt-6 md:pb-6">
      {!apiKey && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm print:hidden">
          右上の「APIキー設定」から自分のGemini APIキーを登録してください（未登録の場合は生成に失敗します）。
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 print:hidden">
        <input
          type="url"
          required
          placeholder="記事のURLを貼り付け (Qiita, Zenn, Hacker News など)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg brand-gradient px-5 py-3 font-semibold text-white shadow-sm shadow-indigo-900/20 disabled:opacity-50 active:scale-[0.98] transition"
        >
          {loading ? "生成中..." : "要約する"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </p>
      )}

      {loading && !result && (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-5 w-2/3 rounded" />
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-5 flex flex-col gap-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`inline-block text-xs font-semibold rounded-full px-2 py-0.5 ${SOURCE_BADGE_CLASS[result.article.sourceType]}`}
                >
                  {SOURCE_LABEL[result.article.sourceType]}
                </span>
                {result.article.publishedAt && (
                  <span className="text-xs text-gray-500">{formatArticleDate(result.article.publishedAt)}</span>
                )}
                {countryFlag(result.article.country) && (
                  <span className="text-sm" title={result.article.country ?? undefined}>
                    {countryFlag(result.article.country)}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold">{result.article.title ?? "無題の記事"}</h2>
              <a
                href={result.article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 text-xs text-indigo-600 hover:underline"
              >
                元記事を読む ↗
              </a>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 print:hidden">
              {result.cached && (
                <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-1">
                  キャッシュ済み（API節約）
                </span>
              )}
              <button
                type="button"
                onClick={() => downloadTextFile(`${result.article.title ?? "article"}.md`, articleInsightToMarkdown(result))}
                className="rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap"
              >
                📝 MD
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap"
              >
                🖨️ PDF
              </button>
            </div>
          </div>

          {result.insight.isBreakingChange && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="font-bold text-red-700 flex items-center gap-1.5 mb-1">🚨 破壊的変更の可能性</p>
              <p className="text-sm text-red-700 leading-relaxed">{result.insight.breakingChangeSummary}</p>
            </div>
          )}

          {result.insight.githubRepo && <GithubRepoCard repo={result.insight.githubRepo} />}

          <HandsOnGenerator articleId={result.article.id} articleTitle={result.article.title ?? result.article.url} />

          <section className="rounded-xl bg-white shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-5">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">📝 要約</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{result.insight.summary}</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-5">
              <h3 className="font-bold text-green-700 mb-2 flex items-center gap-1.5">✅ メリット</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm leading-relaxed">
                {result.insight.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-200 border-l-4 border-l-amber-500 p-5">
              <h3 className="font-bold text-amber-700 mb-2 flex items-center gap-1.5">⚠️ 懸念点</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm leading-relaxed">
                {result.insight.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-xl bg-white shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-5">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">🔭 今後の展望</h3>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{result.insight.outlook}</p>
          </section>

          <section className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">📖 用語解説（タップで表示）</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.insight.glossary.map((g, i) => (
                <GlossaryTerm key={i} term={g.term} explanation={g.explanation} />
              ))}
            </div>
          </section>

          <ArticleNotes articleId={result.article.id} />
        </div>
      )}
    </div>
  );
}
