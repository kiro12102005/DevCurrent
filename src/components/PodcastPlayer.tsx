"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import type { PodcastEpisodeDto } from "@/types/podcast";

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 通勤・通学モード: 手と目を奪わず、今週の注目記事を音声で聞ける最小限のプレーヤー。
// 1日1本、全ユーザー共有の生成（AiToolPickと同じ運営者キー・共有コンテンツ方針）。
export function PodcastPlayer() {
  const [episode, setEpisode] = useState<PodcastEpisodeDto | null | undefined>(undefined); // undefined = loading
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/podcast/latest")
        .then((res) => res.json())
        .then((data) => setEpisode(data.episode ?? null))
        .catch(() => setEpisode(null));
    });
  }, []);

  if (!episode) return null; // no episode yet / still loading - don't clutter the feed with an empty player

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 print:hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-bold text-gray-800 flex items-center gap-1.5">
          <Mic className="w-4 h-4" strokeWidth={2.25} /> 今日のポッドキャスト
          <span className="text-[11px] font-normal text-gray-400">
            {episode.date}{episode.durationSec ? ` ・ ${formatDuration(episode.durationSec)}` : ""}
          </span>
        </p>
        <button type="button" onClick={() => setShowScript((v) => !v)} className="text-xs text-indigo-600 hover:underline shrink-0">
          {showScript ? "台本を隠す" : "台本を見る"}
        </button>
      </div>
      <audio controls preload="none" src={episode.audioUrl} className="w-full h-10">
        お使いのブラウザは音声再生に対応していません。
      </audio>
      {showScript && (
        <p className="mt-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
          {episode.script}
        </p>
      )}
    </div>
  );
}
