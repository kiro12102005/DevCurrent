"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedArticle, FeedPeriod, FeedResponse } from "@/types/feed";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";
import { formatShortDateWithWeekday, jstDateStringDaysAgo, jstTodayString } from "@/lib/dateRange";
import { countryFlag } from "@/lib/countryLabels";

const DAY_CHIPS = Array.from({ length: 7 }, (_, i) => jstDateStringDaysAgo(i)); // today, then back 6 more days

export function FeedList({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const [period, setPeriod] = useState<FeedPeriod>("week");
  const [date, setDate] = useState<string>(jstTodayString());
  const [featured, setFeatured] = useState<FeedArticle[]>([]);
  const [regular, setRegular] = useState<FeedArticle[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false); // guards against the IntersectionObserver firing more than once per page
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function fetchPage(regularOffset: number): Promise<FeedResponse> {
    const params = new URLSearchParams({ period, date, regularOffset: String(regularOffset) });
    return fetch(`/api/feed?${params}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error ?? "フィードの取得に失敗しました");
        return data as FeedResponse;
      });
  }

  function loadFirstPage(): Promise<void> {
    setLoading(true);
    return fetchPage(0)
      .then((data) => {
        setFeatured(data.featured);
        setRegular(data.regular);
        setHasMore(data.hasMore);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "フィードの取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleLoadMore() {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(regular.length);
      setRegular((prev) => [...prev, ...data.regular]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "フィードの取得に失敗しました");
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/feed/refresh", { method: "POST" });
      await loadFirstPage();
    } finally {
      setRefreshing(false);
    }
  }

  // reload from the top whenever the selected period/date changes. Deferred
  // to a microtask so this effect doesn't set state synchronously during its
  // own commit phase (see react-hooks/set-state-in-effect).
  useEffect(() => {
    queueMicrotask(() => {
      loadFirstPage();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, date]);

  // Infinite scroll: re-attaches after every successful load (regular.length
  // changes) so the observer's callback always closes over the current
  // offset - not a stale one from when the effect first ran.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { rootMargin: "400px" } // start fetching before the sentinel is actually on screen
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, regular.length]);

  const isEmpty = featured.length === 0 && regular.length === 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Qiita / Zenn / Hacker News / ArXiv から自動収集（3時間ごとに自動更新・過去1週間分）
        </p>
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-semibold rounded-full px-3.5 py-1.5 text-white brand-gradient shadow-sm shadow-indigo-900/20 disabled:opacity-50 shrink-0 transition-transform active:scale-95"
        >
          <span className={refreshing ? "animate-spin" : ""}>↻</span>
          {refreshing ? "更新中..." : "今すぐ更新"}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <PeriodChip
          active={period === "week"}
          onClick={() => {
            setPeriod("week");
            setDate(jstTodayString());
          }}
        >
          📅 週間まとめ
        </PeriodChip>
        {DAY_CHIPS.map((d, i) => (
          <PeriodChip
            key={d}
            active={period === "day" && date === d}
            onClick={() => {
              setPeriod("day");
              setDate(d);
            }}
          >
            {i === 0 ? "今日" : formatShortDateWithWeekday(d)}
          </PeriodChip>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</p>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : isEmpty ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-gray-400 text-sm">
            {period === "day"
              ? "この日の記事はまだありません。"
              : "まだ記事がありません。「今すぐ更新」を押すか、自動更新を待ってください。"}
          </p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-amber-700">
                ⭐ 注目ピックアップ（{period === "day" ? formatShortDateWithWeekday(date) : "今週"}）
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featured.map((article) => (
                  <FeedCard key={article.id} article={article} onSelect={onSelectArticle} highlight />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-700">
              {period === "day" ? "この日の記事" : "今週の記事"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regular.map((article) => (
                <FeedCard key={article.id} article={article} onSelect={onSelectArticle} />
              ))}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && <span className="text-sm text-gray-400">読み込み中...</span>}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="skeleton h-4 w-20 rounded-full mb-3" />
          <div className="skeleton h-4 w-full rounded mb-2" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

function PeriodChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
        active ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function FeedCard({
  article,
  onSelect,
  highlight = false,
}: {
  article: FeedArticle;
  onSelect: (url: string) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`group rounded-xl border p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
        highlight
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
          : "border-gray-200 bg-white hover:border-indigo-200"
      }`}
    >
      <div className="flex items-center gap-2 text-xs mb-1.5">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE_BADGE_CLASS[article.sourceType]}`}>
          {SOURCE_LABEL[article.sourceType]}
        </span>
        {countryFlag(article.country) && (
          <span title={article.country ?? undefined}>{countryFlag(article.country)}</span>
        )}
        {article.publishedAt && <span className="text-gray-500">{formatArticleDate(article.publishedAt)}</span>}
        {article.hasInsight && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">要約済み</span>
        )}
      </div>
      <button type="button" onClick={() => onSelect(article.url)} className="block w-full text-left">
        <p className="font-semibold text-gray-800 leading-snug group-hover:text-indigo-600 transition-colors">
          {article.title ?? article.url}
        </p>
      </button>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-block text-xs text-indigo-600 hover:underline"
      >
        元記事を読む ↗
      </a>
    </div>
  );
}
