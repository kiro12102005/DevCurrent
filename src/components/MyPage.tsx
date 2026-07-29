"use client";

import { useState } from "react";
import { Bookmark, BarChart3, GraduationCap, Search, Share2, MessageSquareText } from "lucide-react";
import { SavedList } from "./SavedList";
import { LearningMap } from "./LearningMap";
import { InterviewPractice } from "./InterviewPractice";
import { SharePageSettings } from "./SharePageSettings";
import { RepoBreakingChangeCheck } from "./RepoBreakingChangeCheck";
import { FeedbackForm } from "./FeedbackForm";
import { ContactCard } from "./ContactCard";

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
            onClick={() => setSection(s.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              section === s.key ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <s.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} /> {s.label}
          </button>
        ))}
      </div>

      {section === "saved" && <SavedList onSelectArticle={onSelectArticle} />}
      {section === "map" && <LearningMap />}
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
