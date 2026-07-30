"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, ChevronDown, ChevronUp } from "lucide-react";
import type { PodcastEpisodeDto } from "@/types/podcast";
import { SOURCE_LABEL, SOURCE_BADGE_CLASS } from "@/lib/sourceLabels";
import { hapticTap } from "@/lib/haptics";
import { useT } from "@/lib/i18n/useT";

const COLLAPSE_STORAGE_KEY = "podcast_collapsed_date";

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
  // Collapsed by default: the source-article list (up to 6 entries) was the
  // main contributor to the player pushing the entire rest of the feed
  // off-screen on first load, found via an actual mobile-viewport screenshot
  // - the player itself (title/controls) stays compact and visible either way.
  const [showSources, setShowSources] = useState(false);
  // Once you've listened to today's episode you won't need it again until
  // tomorrow's - collapsible to a compact bar instead of taking up feed
  // space all day. Keyed by episode.date (not just a boolean) so a new
  // day's episode automatically starts expanded again.
  const [collapsed, setCollapsed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = useT();

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/podcast/latest")
        .then((res) => res.json())
        .then((data) => setEpisode(data.episode ?? null))
        .catch(() => setEpisode(null));
    });
  }, []);

  useEffect(() => {
    if (!episode) return;
    // deferred to a microtask so this effect doesn't set state synchronously
    // during its own commit phase (see react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === episode.date);
    });
  }, [episode]);

  function handleCollapse() {
    if (!episode) return;
    hapticTap();
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, episode.date);
    setCollapsed(true);
  }

  function handleExpand() {
    hapticTap();
    window.localStorage.removeItem(COLLAPSE_STORAGE_KEY);
    setCollapsed(false);
  }

  // Lock-screen / control-center playback controls via the standard
  // MediaSession API - works in an installed iOS PWA with no native
  // wrapping needed, unlike a plain <audio controls> element which only
  // shows controls while the app itself is on screen.
  useEffect(() => {
    if (!episode || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.podcastPlayer.title,
      artist: t.podcastPlayer.mediaSessionArtist,
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
  }, [episode, t]);

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

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 px-4 py-2.5 print:hidden text-left"
      >
        <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.podcastPlayer.title}
          <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">{episode.date}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={2.25} />
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4 print:hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
          <Mic className="w-4 h-4" strokeWidth={2.25} /> {t.podcastPlayer.title}
          <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">
            {episode.date}{episode.durationSec ? ` ・ ${formatDuration(episode.durationSec)}` : ""}
          </span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setShowScript((v) => !v)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            {showScript ? t.podcastPlayer.hideScript : t.podcastPlayer.showScript}
          </button>
          <button
            type="button"
            onClick={handleCollapse}
            aria-label={t.podcastPlayer.collapseAriaLabel}
            title={t.podcastPlayer.collapseTitle}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-0.5"
          >
            <ChevronUp className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
      <audio ref={audioRef} controls preload="none" src={episode.audioUrl} className="w-full h-10">
        {t.podcastPlayer.audioUnsupported}
      </audio>

      {episode.sourceArticles.length > 0 && (
        <button
          type="button"
          onClick={() => setShowSources((v) => !v)}
          className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {showSources
            ? t.podcastPlayer.hideSources
            : t.podcastPlayer.showSources.replace("{n}", String(episode.sourceArticles.length))}
        </button>
      )}

      {showSources && episode.sourceArticles.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {episode.sourceArticles.map((a, i) => (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_BADGE_CLASS[a.sourceType]}`}>
                    {SOURCE_LABEL[a.sourceType]}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{a.title}</span>
                </div>
                {a.summary && <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{a.summary}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}

      {showScript && (
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
          {episode.script}
        </p>
      )}
    </div>
  );
}
