"use client";

import { useState } from "react";
import Image from "next/image";
import { Newspaper, Search, Bot, User, type LucideIcon } from "lucide-react";
import { UrlSummarizer } from "./UrlSummarizer";
import { FeedList } from "./FeedList";
import { AiToolPicks } from "./AiToolPicks";
import { MyPage } from "./MyPage";
import { ApiKeySettings } from "./ApiKeySettings";
import { NotificationSubscribe } from "./NotificationSubscribe";
import { AuthMenu } from "./AuthMenu";
import { OnboardingModal } from "./OnboardingModal";

// マイページ hubs everything account-related (保存済み/学習マップ/模擬面接/共有ページ)
// behind one tab instead of adding a new top-level tab per feature - keeps the
// primary nav at 4 items (iOS HIG recommends staying well under ~5) as the
// feature set has grown.
const TAB_ORDER = ["feed", "summarize", "tools", "mypage"] as const;
type Tab = (typeof TAB_ORDER)[number];

const TAB_META: Record<Tab, { icon: LucideIcon; label: string }> = {
  feed: { icon: Newspaper, label: "フィード" },
  summarize: { icon: Search, label: "URLで要約" },
  tools: { icon: Bot, label: "AIツール" },
  mypage: { icon: User, label: "マイページ" },
};

export function AppShell() {
  const [tab, setTab] = useState<Tab>("feed");
  const [externalRequest, setExternalRequest] = useState<{ url: string; token: number } | undefined>();

  function handleSelectArticle(url: string) {
    setExternalRequest({ url, token: Date.now() });
    setTab("summarize");
  }

  return (
    <div className="flex flex-col flex-1">
      <OnboardingModal />
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/80 print:hidden">
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
        {/* desktop-only: mobile already has the bottom nav for tab switching,
            showing both was redundant and ate vertical space on iOS */}
        <div className="hidden md:flex max-w-5xl mx-auto px-4 gap-1 border-t border-gray-100 overflow-x-auto">
          {TAB_ORDER.map((t) => {
            const Icon = TAB_META[t].icon;
            return (
              <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
                <Icon className="w-4 h-4" strokeWidth={2.25} /> {TAB_META[t].label}
              </TabButton>
            );
          })}
        </div>
      </header>

      <main className="flex-1">
        {tab === "feed" && <FeedList onSelectArticle={handleSelectArticle} />}
        {tab === "summarize" && <UrlSummarizer externalRequest={externalRequest} />}
        {tab === "tools" && <AiToolPicks />}
        {tab === "mypage" && <MyPage onSelectArticle={handleSelectArticle} />}
      </main>

      {/* mobile bottom nav mirrors the header tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] print:hidden">
        {TAB_ORDER.map((t) => {
          const Icon = TAB_META[t].icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${tab === t ? "text-indigo-600 font-semibold" : "text-gray-400"}`}
            >
              <Icon className="w-5 h-5" strokeWidth={tab === t ? 2.5 : 2} />
              {TAB_META[t].label === "URLで要約" ? "要約" : TAB_META[t].label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
