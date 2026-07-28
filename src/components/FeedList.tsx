"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedArticle, FeedPeriod, FeedResponse } from "@/types/feed";
import type { SearchResponse } from "@/types/search";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";
import { formatShortDateWithWeekday, jstDateStringDaysAgo, jstTodayString } from "@/lib/dateRange";
import { countryFlag } from "@/lib/countryLabels";
import { useAuth } from "@/lib/auth/AuthContext";
import { PodcastPlayer } from "./PodcastPlayer";

const DAY_CHIPS = Array.from({ length: 7 }, (_, i) => jstDateStringDaysAgo(i)); // today, then back 6 more days
const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

type ArticleState = { isRead: boolean; isBookmarked: boolean };

export function FeedList({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<FeedPeriod>("week");
  const [date, setDate] = useState<string>(jstTodayString());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [featured, setFeatured] = useState<FeedArticle[]>([]);
  const [regular, setRegular] = useState<FeedArticle[]>([]);
  const [states, setStates] = useState<Record<string, ArticleState>>({});
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false); // guards against the IntersectionObserver firing more than once per page
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  // debounce the search box - period/date changes are discrete button clicks
  // (no debounce needed there), but free-text input needs one.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  function loadArticleStates(articles: FeedArticle[]) {
    if (!user || articles.length === 0) return;
    const ids = articles.map((a) => a.id).join(",");
    fetch(`/api/article-states?articleIds=${encodeURIComponent(ids)}`)
      .then((res) => res.json())
      .then((data) => setStates((prev) => ({ ...prev, ...data.states })))
      .catch(() => {});
  }

  function fetchFeedPage(offset: number): Promise<{ items: FeedArticle[]; featured: FeedArticle[]; hasMore: boolean }> {
    const params = new URLSearchParams({
      period,
      date,
      regularOffset: String(offset),
      ...(unreadOnly ? { unreadOnly: "1" } : {}),
      ...(bookmarkedOnly ? { bookmarkedOnly: "1" } : {}),
    });
    return fetch(`/api/feed?${params}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error ?? "フィードの取得に失敗しました");
        const d = data as FeedResponse;
        return { items: d.regular, featured: d.featured, hasMore: d.hasMore };
      });
  }

  function fetchSearchPage(offset: number): Promise<{ items: FeedArticle[]; featured: FeedArticle[]; hasMore: boolean }> {
    const params = new URLSearchParams({
      q: debouncedQuery.trim(),
      offset: String(offset),
      ...(unreadOnly ? { unreadOnly: "1" } : {}),
      ...(bookmarkedOnly ? { bookmarkedOnly: "1" } : {}),
    });
    return fetch(`/api/search?${params}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error ?? "検索に失敗しました");
        const d = data as SearchResponse;
        return { items: d.results, featured: [], hasMore: d.hasMore };
      });
  }

  function fetchPage(offset: number) {
    return isSearching ? fetchSearchPage(offset) : fetchFeedPage(offset);
  }

  function loadFirstPage(): Promise<void> {
    setLoading(true);
    return fetchPage(0)
      .then((data) => {
        setFeatured(data.featured);
        setRegular(data.items);
        setHasMore(data.hasMore);
        setError(null);
        loadArticleStates([...data.featured, ...data.items]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
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
      setRegular((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      loadArticleStates(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
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

  async function handleToggleState(articleId: string, key: "isRead" | "isBookmarked") {
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
      setStates((prev) => ({ ...prev, [articleId]: current })); // roll back on failure
    }
  }

  // reload from the top whenever period/date/search/filters change. Deferred
  // to a microtask so this effect doesn't set state synchronously during its
  // own commit phase (see react-hooks/set-state-in-effect).
  useEffect(() => {
    queueMicrotask(() => {
      loadFirstPage();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, date, debouncedQuery, unreadOnly, bookmarkedOnly]);

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

      <PodcastPlayer />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 記事タイトルを検索（全期間対象）"
        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {!isSearching && (
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
      )}

      {user && (
        <div className="flex gap-2">
          <PeriodChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
            未読のみ
          </PeriodChip>
          <PeriodChip active={bookmarkedOnly} onClick={() => setBookmarkedOnly((v) => !v)}>
            🔖 ブックマークのみ
          </PeriodChip>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</p>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : isEmpty ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{isSearching ? "🔍" : "🌱"}</p>
          <p className="text-gray-400 text-sm">
            {isSearching
              ? `「${debouncedQuery}」に一致する記事が見つかりませんでした。`
              : period === "day"
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
                  <FeedCard
                    key={article.id}
                    article={article}
                    onSelect={onSelectArticle}
                    highlight
                    state={states[article.id]}
                    onToggleState={user ? handleToggleState : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-700">
              {isSearching ? `検索結果「${debouncedQuery}」` : period === "day" ? "この日の記事" : "今週の記事"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regular.map((article) => (
                <FeedCard
                  key={article.id}
                  article={article}
                  onSelect={onSelectArticle}
                  state={states[article.id]}
                  onToggleState={user ? handleToggleState : undefined}
                />
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
  state,
  onToggleState,
}: {
  article: FeedArticle;
  onSelect: (url: string) => void;
  highlight?: boolean;
  state?: ArticleState;
  onToggleState?: (articleId: string, key: "isRead" | "isBookmarked") => void;
}) {
  return (
    <div
      className={`group rounded-xl border p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
        highlight
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
          : "border-gray-200 bg-white hover:border-indigo-200"
      } ${state?.isRead ? "opacity-60" : ""}`}
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
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 hover:underline"
        >
          元記事を読む ↗
        </a>
        {onToggleState && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleState(article.id, "isBookmarked")}
              className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                state?.isBookmarked ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              🔖 {state?.isBookmarked ? "保存済み" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => onToggleState(article.id, "isRead")}
              className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                state?.isRead ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {state?.isRead ? "✅ 既読" : "⬜ 未読"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
