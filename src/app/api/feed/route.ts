import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourceType } from "@/generated/prisma";
import { jstDayRange, jstTodayString, jstWeekRange } from "@/lib/dateRange";

const REGULAR_PAGE_SIZE = 30;
const FEATURED_PER_SOURCE_DAY = 2;
const FEATURED_PER_SOURCE_WEEK = 3;
// ArXiv has no engagement signal (always 0), so it never meaningfully "wins" a
// top-N-by-engagement pick - leave it out of the featured computation.
const FEATURED_SOURCES = [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS] as const;

const SELECT = {
  id: true,
  url: true,
  title: true,
  sourceType: true,
  sourcePublishedAt: true,
  country: true,
  engagementScore: true,
  generation: { select: { id: true } },
} as const;

interface ArticleRow {
  id: string;
  url: string;
  title: string | null;
  sourceType: SourceType;
  sourcePublishedAt: Date | null;
  country: string | null;
  engagementScore: number | null;
  generation: { id: string } | null;
}

function toJson(a: ArticleRow) {
  return {
    id: a.id,
    url: a.url,
    title: a.title,
    sourceType: a.sourceType,
    publishedAt: a.sourcePublishedAt,
    country: a.country,
    engagementScore: a.engagementScore,
    hasInsight: Boolean(a.generation),
  };
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
  const date = searchParams.get("date") || jstTodayString();
  const regularOffset = Math.max(0, Number(searchParams.get("regularOffset") ?? "0") || 0);

  const [rangeStart, rangeEnd] = period === "day" ? jstDayRange(date) : jstWeekRange(date);
  const perSource = period === "day" ? FEATURED_PER_SOURCE_DAY : FEATURED_PER_SOURCE_WEEK;

  const featuredBySource =
    regularOffset === 0
      ? await Promise.all(
          FEATURED_SOURCES.map((sourceType) =>
            prisma.article.findMany({
              where: { sourceType, sourcePublishedAt: { gte: rangeStart, lt: rangeEnd } },
              orderBy: { engagementScore: "desc" },
              take: perSource,
              select: SELECT,
            })
          )
        )
      : [];
  const featured = featuredBySource.flat();
  const featuredIds = featured.map((a) => a.id);

  const regularWhere = {
    sourceType: { not: SourceType.USER_SUBMITTED },
    sourcePublishedAt: { gte: rangeStart, lt: rangeEnd },
    ...(featuredIds.length > 0 ? { id: { notIn: featuredIds } } : {}),
  };

  const [regular, regularTotal] = await Promise.all([
    prisma.article.findMany({
      where: regularWhere,
      orderBy: { sourcePublishedAt: "desc" },
      skip: regularOffset,
      take: REGULAR_PAGE_SIZE,
      select: SELECT,
    }),
    prisma.article.count({ where: regularWhere }),
  ]);

  return NextResponse.json({
    period,
    date,
    featured: featured.map(toJson),
    regular: regular.map(toJson),
    regularOffset,
    regularCount: regularOffset + regular.length,
    regularTotal,
    hasMore: regularOffset + regular.length < regularTotal,
  });
}
