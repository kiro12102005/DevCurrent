"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Search, Calendar, Bookmark, Star, Sprout, CircleCheckBig, Square, Trophy } from "lucide-react";
import type { FeedArticle, FeedPeriod, FeedResponse } from "@/types/feed";
import type { SearchResponse } from "@/types/search";
import { SOURCE_BADGE_CLASS, SOURCE_LABEL } from "@/lib/sourceLabels";
import { formatArticleDate } from "@/lib/formatDate";
import { formatShortDateWithWeekday, jstDateStringDaysAgo, jstTodayString } from "@/lib/dateRange";
import { countryFlag } from "@/lib/countryLabels";
import { useAuth } from "@/lib/auth/AuthContext";
import { hapticTap } from "@/lib/haptics";
import { PodcastPlayer } from "./PodcastPlayer";
import { ShareButton } from "./ShareButton";
import { MonthlyRanking } from "./MonthlyRanking";
import { useT } from "@/lib/i18n/useT";

const DAY_CHIPS = Array.from({ length: 7 }, (_, i) => jstDateStringDaysAgo(i)); // today, then back 6 more days
const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

type ArticleState = { isRead: boolean; isBookmarked: boolean };

export function FeedList({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const { user } = useAuth();
  const t = useT();
  const [period, setPeriod] = useState<FeedPeriod>("week");
  const [date, setDate] = useState<string>(jstTodayString());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [country, setCountry] = useState<string | null>(null); // null = すべて
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [showRanking, setShowRanking] = useState(false);
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

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/feed/countries")
        .then((res) => res.json())
        .then((data) => setAvailableCountries(data.countries ?? []))
        .catch(() => {});
    });
  }, []);

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
      ...(country ? { country } : {}),
    });
    return fetch(`/api/feed?${params}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error ?? t.common.fetchFailedError);
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
        if (!ok) throw new Error(data.error ?? t.feedList.searchFailed);
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
        setError(err instanceof Error ? err.message : t.common.fetchFailedError);
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
      setError(err instanceof Error ? err.message : t.common.fetchFailedError);
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
  }, [period, date, debouncedQuery, unreadOnly, bookmarkedOnly, country]);

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
        <p className="text-xs text-gray-500 dark:text-gray-400">{t.feedList.autoCollectDesc}</p>
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-semibold rounded-full px-3.5 py-1.5 text-white brand-gradient shadow-sm shadow-indigo-900/20 disabled:opacity-50 shrink-0 transition-transform active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
          {refreshing ? t.common.updating : t.feedList.refreshNow}
        </button>
      </div>

      <PodcastPlayer />

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={2} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.feedList.searchPlaceholder}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
      </div>

      {!isSearching && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <PeriodChip
            active={!showRanking && period === "week"}
            onClick={() => {
              setShowRanking(false);
              setPeriod("week");
              setDate(jstTodayString());
            }}
          >
            <Calendar className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.feedList.weeklyDigestChip}
          </PeriodChip>
          {DAY_CHIPS.map((d, i) => (
            <PeriodChip
              key={d}
              active={!showRanking && period === "day" && date === d}
              onClick={() => {
                setShowRanking(false);
                setPeriod("day");
                setDate(d);
              }}
            >
              {i === 0 ? t.feedList.today : formatShortDateWithWeekday(d)}
            </PeriodChip>
          ))}
          <PeriodChip active={showRanking} onClick={() => setShowRanking(true)}>
            <Trophy className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.feedList.monthlyRankingChip}
          </PeriodChip>
        </div>
      )}

      {!isSearching && !showRanking && availableCountries.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <PeriodChip active={country === null} onClick={() => setCountry(null)}>
            {t.feedList.allCountries}
          </PeriodChip>
          {availableCountries.map((c) => (
            <PeriodChip key={c} active={country === c} onClick={() => setCountry(c)}>
              {countryFlag(c) ?? "🌐"} {c}
            </PeriodChip>
          ))}
        </div>
      )}

      {!showRanking && user && (
        <div className="flex gap-2">
          <PeriodChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
            {t.feedList.unreadOnly}
          </PeriodChip>
          <PeriodChip active={bookmarkedOnly} onClick={() => setBookmarkedOnly((v) => !v)}>
            <Bookmark className="w-3.5 h-3.5" strokeWidth={2.25} fill={bookmarkedOnly ? "currentColor" : "none"} /> {t.feedList.bookmarkedOnly}
          </PeriodChip>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400 text-sm">{error}</p>
      )}

      {showRanking ? (
        <MonthlyRanking onSelectArticle={onSelectArticle} />
      ) : loading ? (
        <FeedSkeleton />
      ) : isEmpty ? (
        <div className="text-center py-16">
          {isSearching ? (
            <Search className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          ) : (
            <Sprout className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          )}
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {isSearching
              ? t.feedList.noSearchResultsTemplate.replace("{q}", debouncedQuery)
              : period === "day"
                ? t.feedList.noArticlesToday
                : t.feedList.noArticlesDefault}
          </p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                <Star className="w-4 h-4" strokeWidth={2.25} fill="currentColor" />
                {t.feedList.featuredHeadingPrefix}
                {period === "day" ? formatShortDateWithWeekday(date) : t.feedList.thisWeekLabel}
                {t.feedList.featuredHeadingSuffix}
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
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {isSearching
                ? `${t.feedList.searchResultsHeadingPrefix}${debouncedQuery}${t.feedList.searchResultsHeadingSuffix}`
                : period === "day"
                  ? t.feedList.todaysArticlesHeading
                  : t.feedList.thisWeeksArticlesHeading}
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
                {loadingMore && <span className="text-sm text-gray-400 dark:text-gray-500">{t.common.loading}</span>}
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
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
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
      className={`inline-flex items-center gap-1 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
        active ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
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
  const t = useT();

  return (
    <div
      className={`group rounded-xl border p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
        highlight
          ? "border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 dark:from-amber-950 to-orange-50 dark:to-orange-950"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-200 dark:hover:border-indigo-700"
      } ${state?.isRead ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 text-xs mb-1.5">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE_BADGE_CLASS[article.sourceType]}`}>
          {SOURCE_LABEL[article.sourceType]}
        </span>
        {countryFlag(article.country) && (
          <span title={article.country ?? undefined}>{countryFlag(article.country)}</span>
        )}
        {article.publishedAt && <span className="text-gray-500 dark:text-gray-400">{formatArticleDate(article.publishedAt)}</span>}
        {article.hasInsight && (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-semibold">{t.feedList.summarizedBadge}</span>
        )}
      </div>
      <button type="button" onClick={() => onSelect(article.url)} className="block w-full text-left">
        <p className="font-semibold text-gray-800 dark:text-gray-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {article.title ?? article.url}
        </p>
      </button>
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t.feedList.readOriginal}
          </a>
          <ShareButton title={article.title ?? article.url} url={article.url} className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" />
        </div>
        {onToggleState && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleState(article.id, "isBookmarked")}
              className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                state?.isBookmarked ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" strokeWidth={2.25} fill={state?.isBookmarked ? "currentColor" : "none"} />
              {state?.isBookmarked ? t.common.saved : t.common.save}
            </button>
            <button
              type="button"
              onClick={() => onToggleState(article.id, "isRead")}
              className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                state?.isRead ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {state?.isRead ? (
                <CircleCheckBig className="w-3.5 h-3.5" strokeWidth={2.25} />
              ) : (
                <Square className="w-3.5 h-3.5" strokeWidth={2.25} />
              )}
              {state?.isRead ? t.feedList.read : t.feedList.unread}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
