"use client";

import { useEffect, useState } from "react";
import type { AiToolPickDto } from "@/types/tools";

const CATEGORY_ICON: Record<string, string> = {
  AIサービス: "🤖",
  iOSアプリ: "📱",
  PC機能: "💻",
  開発支援ツール: "🛠️",
  ブラウザ拡張: "🧩",
};

export function AiToolPicks() {
  const [picks, setPicks] = useState<AiToolPickDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("すべて");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadPicks() {
    setLoading(true);
    return fetch("/api/tools")
      .then((res) => res.json())
      .then((data) => {
        setPicks(data.picks ?? []);
        setError(null);
      })
      .catch(() => setError("読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadPicks();
    });
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/tools/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      await loadPicks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setRefreshing(false);
    }
  }

  const categories = ["すべて", ...Array.from(new Set(picks.map((p) => p.category)))];
  const visible = category === "すべて" ? picks : picks.filter((p) => p.category === category);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Geminiが選ぶ、今知っておきたいAIツール・アプリのピックアップ</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-semibold rounded-full px-3.5 py-1.5 text-white brand-gradient shadow-sm shadow-indigo-900/20 disabled:opacity-50 shrink-0 transition-transform active:scale-95"
        >
          <span className={refreshing ? "animate-spin" : ""}>↻</span>
          {refreshing ? "更新中..." : "更新する"}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</p>}

      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                category === c ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="skeleton h-4 w-1/3 rounded-full mb-3" />
              <div className="skeleton h-4 w-full rounded mb-2" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-gray-400 text-sm">
            まだピックアップがありません。「更新する」を押すとGeminiが最新のAIツールを選定します。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((pick) => (
            <div
              key={pick.id}
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-200"
            >
              <div className="flex items-center gap-2 text-xs mb-1.5">
                <span className="rounded-full px-2 py-0.5 font-semibold bg-violet-100 text-violet-700">
                  {CATEGORY_ICON[pick.category] ?? "✨"} {pick.category}
                </span>
              </div>
              <p className="font-bold text-gray-800 mb-1.5 group-hover:text-indigo-600 transition-colors">{pick.name}</p>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{pick.summary}</p>
              <p className="text-xs text-gray-500 mb-1">
                <span className="font-semibold text-gray-600">おすすめの人: </span>
                {pick.recommendedFor}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                <span className="font-semibold text-gray-600">活用例: </span>
                {pick.useCaseExample}
              </p>
              {pick.sourceUrl && (
                <a
                  href={pick.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  公式サイトを見る ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
