"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UrlSummarizer } from "./UrlSummarizer";
import { FeedList } from "./FeedList";
import { AiToolPicks } from "./AiToolPicks";
import { NotesList } from "./NotesList";
import { ApiKeySettings } from "./ApiKeySettings";
import { NotificationSubscribe } from "./NotificationSubscribe";
import { AuthMenu } from "./AuthMenu";

const TAB_ORDER = ["feed", "summarize", "tools", "notes"] as const;
type Tab = (typeof TAB_ORDER)[number];

const TAB_META: Record<Tab, { icon: string; label: string }> = {
  feed: { icon: "📰", label: "フィード" },
  summarize: { icon: "🔍", label: "URLで要約" },
  tools: { icon: "🤖", label: "AIツール" },
  notes: { icon: "📝", label: "マイメモ" },
};

// swipe must be mostly horizontal and clear this distance to count as a tab
// change - keeps vertical scrolling from being misread as a swipe.
const SWIPE_THRESHOLD_PX = 60;

export function AppShell() {
  const [tab, setTab] = useState<Tab>("feed");
  const [externalRequest, setExternalRequest] = useState<{ url: string; token: number } | undefined>();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleSelectArticle(url: string) {
    setExternalRequest({ url, token: Date.now() });
    setTab("summarize");
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const currentIndex = TAB_ORDER.indexOf(tab);
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < TAB_ORDER.length) {
      setTab(TAB_ORDER[nextIndex]);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/icon-192.png"
              alt=""
              width={34}
              height={34}
              className="rounded-[9px] shrink-0 shadow-sm shadow-indigo-900/20"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold brand-gradient-text leading-tight truncate">技術トレンド キャッチアップ</h1>
              <p className="text-[11px] text-gray-500 leading-tight truncate">自動収集フィード＋URL深掘り要約</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationSubscribe />
            <ApiKeySettings />
            <AuthMenu />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 border-t border-gray-100 overflow-x-auto">
          {TAB_ORDER.map((t) => (
            <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
              {TAB_META[t].icon} {TAB_META[t].label}
            </TabButton>
          ))}
        </div>
      </header>

      <main className="flex-1" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === "feed" && <FeedList onSelectArticle={handleSelectArticle} />}
        {tab === "summarize" && <UrlSummarizer externalRequest={externalRequest} />}
        {tab === "tools" && <AiToolPicks />}
        {tab === "notes" && <NotesList onSelectArticle={handleSelectArticle} />}
      </main>

      {/* mobile bottom nav mirrors the header tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex flex-col items-center text-xs transition-colors ${tab === t ? "text-indigo-600 font-semibold" : "text-gray-400"}`}
          >
            <span className="text-lg">{TAB_META[t].icon}</span>
            {TAB_META[t].label === "URLで要約" ? "要約" : TAB_META[t].label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
