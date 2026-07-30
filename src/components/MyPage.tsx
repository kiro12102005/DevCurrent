"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BarChart3, GraduationCap, Search, Share2, MessageSquareText, Megaphone, Info, Lock } from "lucide-react";
import { SavedList } from "./SavedList";
import { LearningMap } from "./LearningMap";
import { InterviewPractice } from "./InterviewPractice";
import { SharePageSettings } from "./SharePageSettings";
import { RepoBreakingChangeCheck } from "./RepoBreakingChangeCheck";
import { FeedbackForm } from "./FeedbackForm";
import { ContactCard } from "./ContactCard";
import { MonthlySummaryShare } from "./MonthlySummaryShare";
import { AnnouncementsSection } from "./AnnouncementsSection";
import { useUnreadAnnouncementCount } from "@/lib/announcements";
import { hapticTap } from "@/lib/haptics";
import { useT } from "@/lib/i18n/useT";

const SECTION_KEYS = ["announcements", "saved", "map", "interview", "repo", "share", "feedback"] as const;
const SECTION_ICON = {
  announcements: Megaphone,
  saved: Bookmark,
  map: BarChart3,
  interview: GraduationCap,
  repo: Search,
  share: Share2,
  feedback: MessageSquareText,
} as const;
type SectionKey = (typeof SECTION_KEYS)[number];

// A single hub tab for everything account/personal - keeps AppShell's primary
// nav at 4 items while still having room to grow this list without adding
// more top-level tabs (same pattern as e.g. X's "More" tab or a typical app's
// "Profile" tab housing several sub-sections).
export function MyPage({ onSelectArticle }: { onSelectArticle: (url: string) => void }) {
  const [section, setSection] = useState<SectionKey>("saved");
  const t = useT();
  const unreadAnnouncements = useUnreadAnnouncementCount();

  const SECTION_LABEL: Record<SectionKey, string> = {
    announcements: t.myPage.sectionAnnouncements,
    saved: t.myPage.sectionSaved,
    map: t.myPage.sectionMap,
    interview: t.myPage.sectionInterview,
    repo: t.myPage.sectionRepo,
    share: t.myPage.sectionShare,
    feedback: t.myPage.sectionFeedback,
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 px-4 pb-24 pt-6 md:pb-6">
      {/* Grid instead of a horizontally-scrolling chip row - on a narrow iOS
          screen, 6 chips in one scrollable row only show 3-4 at a time with
          no visual hint that more exist off-screen. A 2-column grid shows
          every section at a glance with no scrolling required. */}
      <div className="grid grid-cols-2 gap-2 print:hidden">
        {SECTION_KEYS.map((key) => {
          const Icon = SECTION_ICON[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                hapticTap();
                setSection(key);
              }}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                section === key ? "brand-gradient text-white shadow-sm shadow-indigo-900/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} /> {SECTION_LABEL[key]}
              {key === "announcements" && unreadAnnouncements > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          );
        })}
        {/* These two navigate away (real pages, not in-tab sections) - kept in
            the same grid for visual consistency, but Links rather than
            setSection buttons. */}
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Info className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} /> {t.myPage.aboutLink}
        </Link>
        <Link
          href="/privacy"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} /> {t.myPage.privacyLink}
        </Link>
      </div>

      {section === "announcements" && <AnnouncementsSection />}
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
