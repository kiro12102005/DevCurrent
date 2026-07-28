import type { SourceType } from "./insight";

export interface FeedArticle {
  id: string;
  url: string;
  title: string | null;
  sourceType: SourceType;
  publishedAt: string | null;
  country: string | null;
  engagementScore: number | null;
  hasInsight: boolean;
}

export type FeedPeriod = "day" | "week";

export interface FeedResponse {
  period: FeedPeriod;
  date: string;
  featured: FeedArticle[];
  regular: FeedArticle[];
  regularOffset: number;
  regularCount: number;
  regularTotal: number;
  hasMore: boolean;
}
