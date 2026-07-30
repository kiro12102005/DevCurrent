"use client";

import { useEffect, useState } from "react";
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
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";

// マイページ hubs everything account-related (保存済み/学習マップ/模擬面接/共有ページ)
// behind one tab instead of adding a new top-level tab per feature - keeps the
// primary nav at 4 items (iOS HIG recommends staying well under ~5) as the
// feature set has grown.
const TAB_ORDER = ["feed", "summarize", "tools", "mypage"] as const;
type Tab = (typeof TAB_ORDER)[number];

const TAB_ICON: Record<Tab, LucideIcon> = {
  feed: Newspaper,
  summarize: Search,
  tools: Bot,
  mypage: User,
};

export function AppShell() {
  const [tab, setTab] = useState<Tab>("feed");
  const [externalRequest, setExternalRequest] = useState<{ url: string; token: number } | undefined>();
  const language = useLanguage();
  const t = useT();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const TAB_LABEL: Record<Tab, string> = {
    feed: t.appShell.tabFeed,
    summarize: t.appShell.tabSummarize,
    tools: t.appShell.tabTools,
    mypage: t.appShell.tabMyPage,
  };

  function handleSelectArticle(url: string) {
    setExternalRequest({ url, token: Date.now() });
    setTab("summarize");
  }

  return (
    <div className="flex flex-col flex-1">
      <OnboardingModal />
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 print:hidden">
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
              <h1 className="text-lg font-bold brand-gradient-text leading-tight truncate">{t.appShell.title}</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight truncate">{t.appShell.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <NotificationSubscribe />
            <ApiKeySettings />
            <AuthMenu />
          </div>
        </div>
        {/* desktop-only: mobile already has the bottom nav for tab switching,
            showing both was redundant and ate vertical space on iOS */}
        <div className="hidden md:flex max-w-5xl mx-auto px-4 gap-1 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {TAB_ORDER.map((tabKey) => {
            const Icon = TAB_ICON[tabKey];
            return (
              <TabButton key={tabKey} active={tab === tabKey} onClick={() => setTab(tabKey)}>
                <Icon className="w-4 h-4" strokeWidth={2.25} /> {TAB_LABEL[tabKey]}
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] print:hidden">
        {TAB_ORDER.map((tabKey) => {
          const Icon = TAB_ICON[tabKey];
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${tab === tabKey ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-gray-400 dark:text-gray-500"}`}
            >
              <Icon className="w-5 h-5" strokeWidth={tab === tabKey ? 2.5 : 2} />
              {tabKey === "summarize" ? t.appShell.tabSummarizeMobile : TAB_LABEL[tabKey]}
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
        active ? "border-indigo-600 text-indigo-700 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}
