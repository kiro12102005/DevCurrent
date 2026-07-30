"use client";

import { useEffect, useState } from "react";
import { Bookmark, CircleCheckBig, Square } from "lucide-react";
import type { FeedArticle } from "@/types/feed";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";
import { countryFlag } from "@/lib/countryLabels";
import { useAuth } from "@/lib/auth/AuthContext";
import { hapticTap } from "@/lib/haptics";
import { ShareButton } from "./ShareButton";
import { useT } from "@/lib/i18n/useT";

type ArticleState = { isRead: boolean; isBookmarked: boolean };

// Trailing-30-day engagement ranking, purely by engagement score (unlike
// the day/week "featured" sections, which deliberately balance per source -
// see lib/feedQuery.ts) - a ranking should show what actually won, not a
// source-balanced sample.
export function MonthlyRanking({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<FeedArticle[] | null>(null);
  const [states, setStates] = useState<Record<string, ArticleState>>({});
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/feed/ranking")
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error ?? t.monthlyRanking.fetchError);
          setRanking(data.ranking);
          if (user && data.ranking.length > 0) {
            const ids = data.ranking.map((a: FeedArticle) => a.id).join(",");
            fetch(`/api/article-states?articleIds=${encodeURIComponent(ids)}`)
              .then((res) => res.json())
              .then((d) => setStates(d.states ?? {}))
              .catch(() => {});
          }
        })
        .catch((err) => setError(err instanceof Error ? err.message : t.monthlyRanking.fetchError));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleState(articleId: string, key: "isRead" | "isBookmarked") {
    hapticTap();
    const current = states[articleId] ?? { isRead: false, isBookmarked: false };
    const next = { ...current, [key]: !current[key] };
    setStates((prev) => ({ ...prev, [articleId]: next }));
    try {
      await fetch(`/api/article-states/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
    } catch {
      setStates((prev) => ({ ...prev, [articleId]: current }));
    }
  }

  if (error) {
    return <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400 text-sm">{error}</p>;
  }

  if (!ranking) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (ranking.length === 0) {
    return <p className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">{t.monthlyRanking.noArticlesYet}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {ranking.map((article, i) => {
        const state = states[article.id];
        return (
          <li
            key={article.id}
            className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm flex items-start gap-3 ${state?.isRead ? "opacity-60" : ""}`}
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < 3 ? "brand-gradient text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE_BADGE_CLASS[article.sourceType]}`}>
                  {SOURCE_LABEL[article.sourceType]}
                </span>
                {countryFlag(article.country) && <span title={article.country ?? undefined}>{countryFlag(article.country)}</span>}
                {article.publishedAt && <span className="text-gray-500 dark:text-gray-400">{formatArticleDate(article.publishedAt)}</span>}
              </div>
              <button type="button" onClick={() => onSelectArticle(article.url)} className="block w-full text-left">
                <p className="font-semibold text-gray-800 dark:text-gray-100 leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
                  {article.title ?? article.url}
                </p>
              </button>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <ShareButton title={article.title ?? article.url} url={article.url} className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" />
                {user && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleToggleState(article.id, "isBookmarked")}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        state?.isBookmarked ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Bookmark className="w-3 h-3" strokeWidth={2.25} fill={state?.isBookmarked ? "currentColor" : "none"} />
                      {t.common.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleState(article.id, "isRead")}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        state?.isRead ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {state?.isRead ? <CircleCheckBig className="w-3 h-3" strokeWidth={2.25} /> : <Square className="w-3 h-3" strokeWidth={2.25} />}
                      {t.monthlyRanking.readLabel}
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
