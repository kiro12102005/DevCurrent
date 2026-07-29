"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BarChart3, GraduationCap, Search, Share2, MessageSquareText, Info } from "lucide-react";
import { SavedList } from "./SavedList";
import { LearningMap } from "./LearningMap";
import { InterviewPractice } from "./InterviewPractice";
import { SharePageSettings } from "./SharePageSettings";
import { RepoBreakingChangeCheck } from "./RepoBreakingChangeCheck";
import { FeedbackForm } from "./FeedbackForm";
import { ContactCard } from "./ContactCard";
import { MonthlySummaryShare } from "./MonthlySummaryShare";
import { hapticTap } from "@/lib/haptics";

const SECTIONS = [
  { key: "saved", icon: Bookmark, label: "保存済み" },
  { key: "map", icon: BarChart3, label: "学習マップ" },
  { key: "interview", icon: GraduationCap, label: "模擬面接" },
  { key: "repo", icon: Search, label: "リポジトリチェック" },
  { key: "share", icon: Share2, label: "共有ページ" },
  { key: "feedback", icon: MessageSquareText, label: "フィードバック" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

// A single hub tab for everything account/personal - keeps AppShell's primary
// nav at 4 items while still having room to grow this list without adding
// more top-level tabs (same pattern as e.g. X's "More" tab or a typical app's
// "Profile" tab housing several sub-sections).
export function MyPage({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const [section, setSection] = useState<SectionKey>("saved");

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      {/* Grid instead of a horizontally-scrolling chip row - on a narrow iOS
          screen, 6 chips in one scrollable row only show 3-4 at a time with
          no visual hint that more exist off-screen. A 2-column grid shows
          every section at a glance with no scrolling required. */}
      <div className="grid grid-cols-2 gap-2 print:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              hapticTap();
              setSection(s.key);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              section === s.key ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <s.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} /> {s.label}
          </button>
        ))}
        {/* Navigates away (a real page, not an in-tab section) - kept in the
            same grid for visual consistency, but a Link rather than a
            setSection button. Odd item count is fine in a 2-col grid (this
            one just sits alone in the last row). */}
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Info className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} /> 技術スタックについて
        </Link>
      </div>

      {section === "saved" && <SavedList onSelectArticle={onSelectArticle} />}
      {section === "map" && (
        <div className="flex flex-col gap-4">
          <LearningMap />
          <MonthlySummaryShare />
        </div>
      )}
      {section === "interview" && <InterviewPractice />}
      {section === "repo" && <RepoBreakingChangeCheck />}
      {section === "share" && <SharePageSettings />}
      {section === "feedback" && (
        <div className="flex flex-col gap-4">
          <ContactCard />
          <FeedbackForm />
        </div>
      )}
    </div>
  );
}
