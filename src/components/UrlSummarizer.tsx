"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Printer, TriangleAlert, Swords, ThumbsUp, ThumbsDown, CircleCheckBig, Telescope, BookOpen } from "lucide-react";
import type { SummarizeResponse } from "@/types/insight";
import { GlossaryTerm } from "./GlossaryTerm";
import { ArticleNotes } from "./ArticleNotes";
import { GithubRepoCard } from "./GithubRepoCard";
import { HandsOnGenerator } from "./HandsOnGenerator";
import { EditorConfigGenerator } from "./EditorConfigGenerator";
import { ShareButton } from "./ShareButton";
import { useStoredApiKey } from "@/lib/apiKeyStorage";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";
import { countryFlag } from "@/lib/countryLabels";
import { downloadTextFile } from "@/lib/download";
import { articleInsightToMarkdown } from "@/lib/exportMarkdown";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";

// externalRequest.token must change (e.g. Date.now() at click time) even if the
// same URL is picked twice in a row, so the effect below re-triggers reliably.
export function UrlSummarizer({ externalRequest }: { externalRequest?: { url: string; token: number } }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const apiKey = useStoredApiKey();
  const language = useLanguage();
  const t = useT();
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
        body: JSON.stringify({ url: targetUrl, lang: language !== "ja" ? language : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? t.common.genericError);
      }
      setResult(data as SummarizeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.genericError);
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
        <p className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3 text-amber-800 dark:text-amber-400 text-sm print:hidden">
          {t.urlSummarizer.apiKeyWarning}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 print:hidden">
        <input
          type="url"
          required
          placeholder={t.urlSummarizer.urlPlaceholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg brand-gradient px-5 py-3 font-semibold text-white shadow-sm shadow-indigo-900/20 disabled:opacity-50 active:scale-[0.98] transition"
        >
          {loading ? t.common.generating : t.urlSummarizer.summarizeButton}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </p>
      )}

      {loading && !result && (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-5 w-2/3 rounded" />
          <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-2">
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
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatArticleDate(result.article.publishedAt)}</span>
                )}
                {countryFlag(result.article.country) && (
                  <span className="text-sm" title={result.article.country ?? undefined}>
                    {countryFlag(result.article.country)}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold">{result.article.title ?? t.urlSummarizer.untitledArticle}</h2>
              <div className="flex items-center gap-1 mt-1">
                <a
                  href={result.article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t.urlSummarizer.readOriginal}
                </a>
                <ShareButton
                  title={result.article.title ?? result.article.url}
                  url={result.article.url}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 print:hidden">
              {result.cached && (
                <span className="text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 px-2 py-1">
                  {t.urlSummarizer.cachedBadge}
                </span>
              )}
              <button
                type="button"
                onClick={() => downloadTextFile(`${result.article.title ?? "article"}.md`, articleInsightToMarkdown(result))}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap"
              >
                <FileText className="w-3 h-3" strokeWidth={2.25} /> {t.urlSummarizer.downloadMd}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap"
              >
                <Printer className="w-3 h-3" strokeWidth={2.25} /> {t.urlSummarizer.downloadPdf}
              </button>
            </div>
          </div>

          {result.insight.isBreakingChange && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
              <p className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-1">
                <TriangleAlert className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.breakingChangeTitle}
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{result.insight.breakingChangeSummary}</p>
            </div>
          )}

          {result.insight.githubRepo && <GithubRepoCard repo={result.insight.githubRepo} />}

          {result.insight.debateMatrix && (result.insight.debateMatrix.pro.length > 0 || result.insight.debateMatrix.con.length > 0) && (
            <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1.5">
                <Swords className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.debateMatrixTitle}
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">{t.urlSummarizer.debateMatrixSubtitle}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 mb-2">
                    <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.urlSummarizer.proLabel}
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {result.insight.debateMatrix.pro.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
                    <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.urlSummarizer.conLabel}
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {result.insight.debateMatrix.con.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <HandsOnGenerator articleId={result.article.id} articleTitle={result.article.title ?? result.article.url} />

          <EditorConfigGenerator articleId={result.article.id} />

          <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 border-l-4 border-l-indigo-500 p-5">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.summaryTitle}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{result.insight.summary}</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 border-l-4 border-l-green-500 p-5">
              <h3 className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
                <CircleCheckBig className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.prosTitle}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {result.insight.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 border-l-4 border-l-amber-500 p-5">
              <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.consTitle}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {result.insight.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 border-l-4 border-l-indigo-500 p-5">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
              <Telescope className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.outlookTitle}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-line">{result.insight.outlook}</p>
          </section>

          <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" strokeWidth={2.25} /> {t.urlSummarizer.glossaryTitle}
            </h3>
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
