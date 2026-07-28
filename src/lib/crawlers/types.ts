import type { SourceType } from "@/generated/prisma";

export interface CrawledArticle {
  url: string;
  title: string;
  sourceType: SourceType;
  publishedAt: Date | null;
  // raw popularity signal in the source's own unit (likes/points/stocks) -
  // only comparable within the same source, normalized later in scoring.ts
  engagement: number;
  // best-guess origin country. Qiita/Zenn crawlers set this directly (always
  // Japan); Hacker News/ArXiv leave it unset and refresh.ts fills it in via
  // Gemini (title-only best-effort, upgraded to a content-based guess if the
  // article later gets a full insight generation).
  country?: string | null;
}
