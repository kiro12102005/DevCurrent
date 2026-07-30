import type { SourceType } from "@/types/insight";

// Out of scope for the i18n sweep (see src/lib/i18n/) - most values are
// already source proper nouns (Qiita/Zenn/Hacker News/ArXiv); only
// AI_TOOL_PICK/USER_SUBMITTED are Japanese and stay that way for now.
export const SOURCE_LABEL: Record<SourceType, string> = {
  QIITA: "Qiita",
  ZENN: "Zenn",
  HACKER_NEWS: "Hacker News",
  ARXIV: "ArXiv",
  AI_TOOL_PICK: "AIツール",
  USER_SUBMITTED: "投稿URL",
};

// distinct per-source color so the badge is scannable at a glance, not just readable
export const SOURCE_BADGE_CLASS: Record<SourceType, string> = {
  QIITA: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300",
  ZENN: "bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-300",
  HACKER_NEWS: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300",
  ARXIV: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300",
  AI_TOOL_PICK: "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300",
  USER_SUBMITTED: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
};
