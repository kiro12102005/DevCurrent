"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Smartphone, Monitor, Wrench, Puzzle, Sparkles, RefreshCw, Bookmark } from "lucide-react";
import type { AiToolPickDto, AiToolPicksResponse } from "@/types/tools";
import { useAuth } from "@/lib/auth/AuthContext";

const CATEGORY_ICON: Record<string, typeof Bot> = {
  AIサービス: Bot,
  iOSアプリ: Smartphone,
  PC機能: Monitor,
  開発支援ツール: Wrench,
  ブラウザ拡張: Puzzle,
};

export function AiToolPicks() {
  const { user } = useAuth();
  const [picks, setPicks] = useState<AiToolPickDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<string>("すべて");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function fetchPage(offset: number): Promise<AiToolPicksResponse> {
    return fetch(`/api/tools?offset=${offset}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error ?? "読み込みに失敗しました");
        return data as AiToolPicksResponse;
      });
  }

  function loadFirstPage(): Promise<void> {
    setLoading(true);
    return fetchPage(0)
      .then((data) => {
        setPicks(data.picks);
        setHasMore(data.hasMore);
        setError(null);
      })
      .catch(() => setError("読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadFirstPage();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadMore() {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(picks.length);
      setPicks((prev) => [...prev, ...data.picks]);
      setHasMore(data.hasMore);
    } catch {
      setError("読み込みに失敗しました");
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, picks.length]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/tools/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      await loadFirstPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleToggleBookmark(toolId: string, next: boolean) {
    setPicks((prev) => prev.map((p) => (p.id === toolId ? { ...p, isBookmarked: next } : p)));
    try {
      await fetch(`/api/tools/${toolId}/bookmark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBookmarked: next }),
      });
    } catch {
      setPicks((prev) => prev.map((p) => (p.id === toolId ? { ...p, isBookmarked: !next } : p)));
    }
  }

  const categories = ["すべて", ...Array.from(new Set(picks.map((p) => p.category)))];
  const visible = picks
    .filter((p) => category === "すべて" || p.category === category)
    .filter((p) => !bookmarkedOnly || p.isBookmarked);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Geminiが選ぶ、今知っておきたいAIツール・アプリのピックアップ</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-semibold rounded-full px-3.5 py-1.5 text-white brand-gradient shadow-sm shadow-indigo-900/20 disabled:opacity-50 shrink-0 transition-transform active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
          {refreshing ? "更新中..." : "更新する"}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400 text-sm">{error}</p>}

      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                category === c ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {user && (
        <button
          type="button"
          onClick={() => setBookmarkedOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 self-start shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            bookmarkedOnly ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" strokeWidth={2.25} fill={bookmarkedOnly ? "currentColor" : "none"} /> ブックマークのみ
        </button>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="skeleton h-4 w-1/3 rounded-full mb-3" />
              <div className="skeleton h-4 w-full rounded mb-2" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <Bot className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {bookmarkedOnly
              ? "ブックマークしたツールがまだありません。"
              : "まだピックアップがありません。「更新する」を押すとGeminiが最新のAIツールを選定します。"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((pick) => (
              <div
                key={pick.id}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-400">
                    {(() => {
                      const CategoryIcon = CATEGORY_ICON[pick.category] ?? Sparkles;
                      return <CategoryIcon className="w-3 h-3" strokeWidth={2.25} />;
                    })()}
                    {pick.category}
                  </span>
                  {user && (
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(pick.id, !pick.isBookmarked)}
                      className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                        pick.isBookmarked ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" strokeWidth={2.25} fill={pick.isBookmarked ? "currentColor" : "none"} />
                      {pick.isBookmarked ? "保存済み" : "保存"}
                    </button>
                  )}
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-100 mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{pick.name}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{pick.summary}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">おすすめの人: </span>
                  {pick.recommendedFor}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">活用例: </span>
                  {pick.useCaseExample}
                </p>
                {pick.sourceUrl && (
                  <a
                    href={pick.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    公式サイトを見る ↗
                  </a>
                )}
              </div>
            ))}
          </div>
          {hasMore && !bookmarkedOnly && category === "すべて" && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && <span className="text-sm text-gray-400 dark:text-gray-500">読み込み中...</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
