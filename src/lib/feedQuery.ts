import { prisma } from "@/lib/prisma";
import { SourceType, type Prisma } from "@/generated/prisma";
import { jstDayRange, jstWeekRange } from "@/lib/dateRange";
import { ARTICLE_LIST_SELECT, toFeedArticle } from "@/lib/articleSelect";
import type { FeedArticle, FeedPeriod } from "@/types/feed";

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REGULAR_PAGE_SIZE = 30;
const FEATURED_PER_SOURCE_DAY = 2;
const FEATURED_PER_SOURCE_WEEK = 3;
// ArXiv has no engagement signal (always 0), so it never meaningfully "wins" a
// top-N-by-engagement pick - leave it out of the featured computation.
// GITHUB_TRENDING is browsing-only (see refresh.ts), not featured here either.
const FEATURED_SOURCES = [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS, SourceType.RELEASE_NOTES] as const;

// Qiita/Zenn (dedicated Japanese blogging platforms) crawl far more raw
// volume per week than Hacker News' quality-filtered output or ArXiv's
// narrow category scope - Qiita/Zenn combined can produce 5-10x Hacker
// News/ArXiv's count. A single date-sorted query across all sources let
// that raw volume difference completely dominate the "regular" list - not
// just in total, but visibly on every single page, since the most-recently-
// published source wins each chronological slot far more often. Each source
// now gets its own capped, separately-queried, most-recent pool, and pages
// are built by round-robin interleaving those pools (see interleaveBySource)
// rather than a flat chronological merge, so every page is actually
// balanced across sources, not just the total across all pages.
const REGULAR_SOURCES = [
  SourceType.QIITA,
  SourceType.ZENN,
  SourceType.HACKER_NEWS,
  SourceType.ARXIV,
  SourceType.GITHUB_TRENDING,
  SourceType.RELEASE_NOTES,
] as const;
const REGULAR_POOL_PER_SOURCE_DAY = 15;
const REGULAR_POOL_PER_SOURCE_WEEK = 60;

// Interleaves already-sorted (most-recent-first) per-source arrays: index 0
// from every source first, then index 1 from every source, etc. Trades
// strict global chronological order for balanced representation - a page
// pulled from the front of the result is recent-and-balanced rather than
// recent-and-dominated-by-whichever-source-posts-most-often.
function interleaveBySource<T>(bySource: T[][]): T[] {
  const result: T[] = [];
  const maxLen = Math.max(0, ...bySource.map((arr) => arr.length));
  for (let i = 0; i < maxLen; i++) {
    for (const arr of bySource) {
      if (arr[i] !== undefined) result.push(arr[i]);
    }
  }
  return result;
}

export interface FeedPageParams {
  period: FeedPeriod;
  date: string;
  regularOffset?: number;
  country?: string | null;
  sourceTypes?: SourceType[] | null;
  stateFilter?: Prisma.ArticleWhereInput;
}

export interface FeedPageResult {
  period: FeedPeriod;
  date: string;
  featured: FeedArticle[];
  regular: FeedArticle[];
  regularOffset: number;
  regularCount: number;
  regularTotal: number;
  hasMore: boolean;
}

// Shared by GET /api/feed (browser, session-aware read/bookmark filters) and
// the MCP server's get_feed tool (no session - stateFilter is always {} there).
// The feed is scoped to a day or a trailing 7-day week (JST) rather than
// "everything ever crawled" - that's both what the user asked for (browse by
// day/week so a quiet day doesn't get buried under today's articles) and a
// natural cap on how much a single view has to query/render.
//
// "featured" is computed fresh for the selected range (top-N by engagement
// per source) rather than relying solely on the isFeatured flag set once at
// crawl time - that flag only ever saw one crawl batch, not the whole day/week.
export async function getFeedPage(params: FeedPageParams): Promise<FeedPageResult> {
  const { period, date } = params;
  const regularOffset = Math.max(0, params.regularOffset ?? 0);
  const stateFilter = params.stateFilter ?? {};
  const countryFilter: Prisma.ArticleWhereInput = params.country ? { country: params.country } : {};
  // No filter (undefined/null) means "all sources" - an empty array is treated
  // the same way (nothing to narrow down to) rather than matching zero sources.
  const sourceTypeSet = params.sourceTypes && params.sourceTypes.length > 0 ? new Set(params.sourceTypes) : null;

  const [rangeStart, rangeEnd] = period === "day" ? jstDayRange(date) : jstWeekRange(date);
  const perSource = period === "day" ? FEATURED_PER_SOURCE_DAY : FEATURED_PER_SOURCE_WEEK;

  const activeFeaturedSources = sourceTypeSet ? FEATURED_SOURCES.filter((s) => sourceTypeSet.has(s)) : FEATURED_SOURCES;
  const featuredBySource =
    regularOffset === 0
      ? await Promise.all(
          activeFeaturedSources.map((sourceType) =>
            prisma.article.findMany({
              where: { sourceType, sourcePublishedAt: { gte: rangeStart, lt: rangeEnd }, ...stateFilter, ...countryFilter },
              orderBy: { engagementScore: "desc" },
              take: perSource,
              select: ARTICLE_LIST_SELECT,
            })
          )
        )
      : [];
  const featured = featuredBySource.flat();
  const featuredIds = featured.map((a) => a.id);

  const activeRegularSources = sourceTypeSet ? REGULAR_SOURCES.filter((s) => sourceTypeSet.has(s)) : REGULAR_SOURCES;
  const poolCap = period === "day" ? REGULAR_POOL_PER_SOURCE_DAY : REGULAR_POOL_PER_SOURCE_WEEK;
  const regularBySource = await Promise.all(
    activeRegularSources.map((sourceType) =>
      prisma.article.findMany({
        where: {
          sourceType,
          sourcePublishedAt: { gte: rangeStart, lt: rangeEnd },
          ...(featuredIds.length > 0 ? { id: { notIn: featuredIds } } : {}),
          ...stateFilter,
          ...countryFilter,
        },
        orderBy: { sourcePublishedAt: "desc" },
        take: poolCap,
        select: ARTICLE_LIST_SELECT,
      })
    )
  );
  const pool = interleaveBySource(regularBySource);
  const regular = pool.slice(regularOffset, regularOffset + REGULAR_PAGE_SIZE);
  const regularTotal = pool.length;

  return {
    period,
    date,
    featured: featured.map(toFeedArticle),
    regular: regular.map(toFeedArticle),
    regularOffset,
    regularCount: regularOffset + regular.length,
    regularTotal,
    hasMore: regularOffset + regular.length < regularTotal,
  };
}
