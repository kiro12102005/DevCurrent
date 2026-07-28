import type { SourceType } from "@/types/insight";

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
  QIITA: "bg-green-100 text-green-800",
  ZENN: "bg-sky-100 text-sky-800",
  HACKER_NEWS: "bg-orange-100 text-orange-800",
  ARXIV: "bg-purple-100 text-purple-800",
  AI_TOOL_PICK: "bg-indigo-100 text-indigo-800",
  USER_SUBMITTED: "bg-gray-100 text-gray-700",
};
