import type { SourceType } from "@/generated/prisma";
import type { FeedArticle } from "@/types/feed";

// Shared Prisma select/shape used by both /api/feed and /api/search, so the
// two list views return identically-shaped rows and FeedCard can render either.
export const ARTICLE_LIST_SELECT = {
  id: true,
  url: true,
  title: true,
  sourceType: true,
  sourcePublishedAt: true,
  country: true,
  engagementScore: true,
  generation: { select: { id: true } },
} as const;

export interface ArticleListRow {
  id: string;
  url: string;
  title: string | null;
  sourceType: SourceType;
  sourcePublishedAt: Date | null;
  country: string | null;
  engagementScore: number | null;
  generation: { id: string } | null;
}

export function toFeedArticle(a: ArticleListRow): FeedArticle {
  return {
    id: a.id,
    url: a.url,
    title: a.title,
    sourceType: a.sourceType,
    publishedAt: a.sourcePublishedAt ? a.sourcePublishedAt.toISOString() : null,
    country: a.country,
    engagementScore: a.engagementScore,
    hasInsight: Boolean(a.generation),
  };
}
