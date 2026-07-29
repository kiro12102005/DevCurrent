"use client";

import { useState } from "react";
import { Download, Share2, ImageIcon } from "lucide-react";
import { downloadBlob } from "@/lib/download";
import { useAuth } from "@/lib/auth/AuthContext";

const FILENAME = `技術トレンド_キャッチアップ_月間サマリー.png`;
const IMAGE_URL = "/api/share/monthly-summary";

// Spotify-Wrapped-style "your month in review" card - generated on the fly
// by /api/share/monthly-summary (next/og ImageResponse). Only fetched when
// the user actually opts to view it (not eagerly on MyPage load) since it's
// a real server render each time, not a cached static asset.
export function MonthlySummaryShare() {
  const { user, loading: authLoading } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(IMAGE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("生成に失敗しました");
      const b = await res.blob();
      setBlob(b);
      setImageUrl(URL.createObjectURL(b));
    } catch {
      setError("生成に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!blob) return;
    downloadBlob(FILENAME, blob);
  }

  async function handleShare() {
    if (!blob) return;
    const file = new File([blob], FILENAME, { type: "image/png" });
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "技術トレンド キャッチアップ 月間サマリー" });
      } catch {
        // AbortError on user-dismissed share sheet - not an error to surface
      }
    } else {
      handleDownload();
    }
  }

  // The API route is session-gated (401 if not logged in) - LearningMap
  // above already shows a login prompt for the whole "map" section, so this
  // just quietly doesn't render rather than showing a second, redundant one.
  if (authLoading || !user) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1.5">
        <ImageIcon className="w-4 h-4" strokeWidth={2.25} /> 今月のキャッチアップ実績を画像でシェア
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
        直近30日間の既読・保存・活動日数を1枚のカード画像にして、SNSや面接での話のネタとして共有できます。
      </p>

      {!imageUrl ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {loading ? "生成中..." : "画像を生成する"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL from an in-memory Blob, next/image's optimizer doesn't apply */}
          <img src={imageUrl} alt="今月のキャッチアップ実績" className="w-full max-w-xs mx-auto rounded-lg shadow-sm" />
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.25} /> 保存
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 text-xs font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" strokeWidth={2.25} /> シェア
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
