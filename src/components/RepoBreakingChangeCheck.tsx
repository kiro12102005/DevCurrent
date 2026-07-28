"use client";

import { useState } from "react";
import { Search, CircleCheckBig, TriangleAlert } from "lucide-react";
import type { RepoCheckResponse } from "@/types/repoCheck";

// "自分のリポジトリへの実害" チェック: 公開npmリポジトリのpackage.jsonを読み、
// このアプリがすでに検知した破壊的変更（isBreakingChange記事）の中から実際に
// 使われているライブラリと一致するものだけをピンポイントで警告する。
// Geminiは呼ばない決定的なキーワード照合なので、何度実行しても無料。
export function RepoBreakingChangeCheck() {
  const [repo, setRepo] = useState("");
  const [result, setResult] = useState<RepoCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!repo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/repo-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "チェックに失敗しました");
      setResult(data as RepoCheckResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "チェックに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
          <Search className="w-4 h-4" strokeWidth={2.25} /> リポジトリチェック
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          公開GitHubリポジトリのpackage.jsonを読み込み、実際に使っているライブラリに関係する破壊的変更ニュースだけをピンポイントで表示します（現在npmプロジェクトのみ対応）。
        </p>
        <form onSubmit={handleCheck} className="flex gap-2">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo（例: vercel/next.js）"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity shrink-0"
          >
            {loading ? "確認中..." : "チェックする"}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">
            {result.repo} の依存関係 {result.dependencyCount}件を確認しました
          </p>
          {result.matches.length === 0 ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <p className="flex items-center gap-1.5 text-sm text-green-700">
                <CircleCheckBig className="w-4 h-4" strokeWidth={2.25} /> 現在検知されている破壊的変更との一致はありませんでした
              </p>
            </div>
          ) : (
            result.matches.map((m, i) => (
              <a
                key={i}
                href={m.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl bg-red-50 border border-red-200 p-4 hover:border-red-300 transition-colors"
              >
                <p className="font-bold text-red-700 flex items-center gap-1.5 mb-1">
                  <TriangleAlert className="w-4 h-4" strokeWidth={2.25} /> {m.keyword} に影響する可能性
                </p>
                <p className="text-xs text-red-600 mb-1">{m.articleTitle}</p>
                <p className="text-sm text-red-700 leading-relaxed">{m.breakingChangeSummary}</p>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
