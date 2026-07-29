"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import type { PodcastEpisodeDto } from "@/types/podcast";
import { SOURCE_LABEL, SOURCE_BADGE_CLASS } from "@/lib/sourceLabels";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/podcast/latest")
        .then((res) => res.json())
        .then((data) => setEpisode(data.episode ?? null))
        .catch(() => setEpisode(null));
    });
  }, []);

  // Lock-screen / control-center playback controls via the standard
  // MediaSession API - works in an installed iOS PWA with no native
  // wrapping needed, unlike a plain <audio controls> element which only
  // shows controls while the app itself is on screen.
  useEffect(() => {
    if (!episode || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: "今日のポッドキャスト",
      artist: "技術トレンド キャッチアップ",
      album: episode.date,
      artwork: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });

    const audio = audioRef.current;
    navigator.mediaSession.setActionHandler("play", () => audio?.play());
    navigator.mediaSession.setActionHandler("pause", () => audio?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      if (!audio) return;
      audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      if (!audio) return;
      audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (details.seekOffset ?? 10));
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [episode]);

  // Keep the lock-screen play/pause indicator in sync with actual playback
  // state (e.g. if the user pauses from the lock screen vs. the in-app button).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const onPlay = () => {
      navigator.mediaSession.playbackState = "playing";
    };
    const onPause = () => {
      navigator.mediaSession.playbackState = "paused";
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [episode]);

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
      <audio ref={audioRef} controls preload="none" src={episode.audioUrl} className="w-full h-10">
        お使いのブラウザは音声再生に対応していません。
      </audio>

      {episode.sourceArticles.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {episode.sourceArticles.map((a, i) => (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-gray-50 hover:bg-gray-100 px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_BADGE_CLASS[a.sourceType]}`}>
                    {SOURCE_LABEL[a.sourceType]}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 truncate">{a.title}</span>
                </div>
                {a.summary && <p className="text-[11px] text-gray-500 leading-relaxed">{a.summary}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}

      {showScript && (
        <p className="mt-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
          {episode.script}
        </p>
      )}
    </div>
  );
}
