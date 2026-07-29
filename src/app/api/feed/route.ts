import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourceType, type Prisma } from "@/generated/prisma";
import { jstDayRange, jstTodayString, jstWeekRange } from "@/lib/dateRange";
import { ARTICLE_LIST_SELECT, toFeedArticle } from "@/lib/articleSelect";
import { getCurrentUser } from "@/lib/auth/session";

const REGULAR_PAGE_SIZE = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FEATURED_PER_SOURCE_DAY = 2;
const FEATURED_PER_SOURCE_WEEK = 3;
// ArXiv has no engagement signal (always 0), so it never meaningfully "wins" a
// top-N-by-engagement pick - leave it out of the featured computation.
const FEATURED_SOURCES = [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS] as const;

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
const REGULAR_SOURCES = [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS, SourceType.ARXIV] as const;
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

// The feed is scoped to a day or a trailing 7-day week (JST) rather than
// "everything ever crawled" - that's both what the user asked for (browse by
// day/week so a quiet day doesn't get buried under today's articles) and a
// natural cap on how much a single view has to query/render.
//
// "featured" is computed fresh for the selected range (top-N by engagement
// per source) rather than relying solely on the isFeatured flag set once at
// crawl time - that flag only ever saw one crawl batch, not the whole day/week.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "day" ? "day" : "week";
  const rawDate = searchParams.get("date");
  // A malformed date (or arbitrary string) would otherwise reach `new Date(...)`
  // inside jstDayRange/jstWeekRange as an Invalid Date, which Prisma then
  // rejects with a 500 instead of a clean 400 - validate the shape up front.
  if (rawDate !== null && !DATE_PATTERN.test(rawDate)) {
    return NextResponse.json({ error: "不正な日付形式です（YYYY-MM-DD）" }, { status: 400 });
  }
  const date = rawDate || jstTodayString();
  const regularOffset = Math.max(0, Number(searchParams.get("regularOffset") ?? "0") || 0);
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const bookmarkedOnly = searchParams.get("bookmarkedOnly") === "1";
  const country = searchParams.get("country");
  const countryFilter: Prisma.ArticleWhereInput = country ? { country } : {};

  // read/bookmark filters are per-user, so they're a no-op for logged-out
  // requests (nothing to filter against) rather than an error.
  const user = unreadOnly || bookmarkedOnly ? await getCurrentUser() : null;
  const stateFilter: Prisma.ArticleWhereInput = user
    ? {
        ...(unreadOnly ? { userStates: { none: { userId: user.id, isRead: true } } } : {}),
        ...(bookmarkedOnly ? { userStates: { some: { userId: user.id, isBookmarked: true } } } : {}),
      }
    : {};

  const [rangeStart, rangeEnd] = period === "day" ? jstDayRange(date) : jstWeekRange(date);
  const perSource = period === "day" ? FEATURED_PER_SOURCE_DAY : FEATURED_PER_SOURCE_WEEK;

  const featuredBySource =
    regularOffset === 0
      ? await Promise.all(
          FEATURED_SOURCES.map((sourceType) =>
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

  const poolCap = period === "day" ? REGULAR_POOL_PER_SOURCE_DAY : REGULAR_POOL_PER_SOURCE_WEEK;
  const regularBySource = await Promise.all(
    REGULAR_SOURCES.map((sourceType) =>
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

  return NextResponse.json({
    period,
    date,
    featured: featured.map(toFeedArticle),
    regular: regular.map(toFeedArticle),
    regularOffset,
    regularCount: regularOffset + regular.length,
    regularTotal,
    hasMore: regularOffset + regular.length < regularTotal,
  });
}
