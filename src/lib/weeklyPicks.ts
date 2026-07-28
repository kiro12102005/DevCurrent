import { prisma } from "@/lib/prisma";
import { SourceType } from "@/generated/prisma";
import { jstWeekRange, jstTodayString } from "@/lib/dateRange";
import { parseGeneration } from "@/lib/summarize";

const FEATURED_SOURCES = [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS] as const;

export interface WeeklyPick {
  title: string;
  url: string;
  summary?: string;
}

// Shared by the weekly digest email and the podcast script generator so
// "this week's top picks" means the same thing in both places.
export async function getWeeklyPicks(picksPerSource: number): Promise<WeeklyPick[]> {
  const [rangeStart, rangeEnd] = jstWeekRange(jstTodayString());
  const bySource = await Promise.all(
    FEATURED_SOURCES.map((sourceType) =>
      prisma.article.findMany({
        where: { sourceType, sourcePublishedAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { engagementScore: "desc" },
        take: picksPerSource,
        select: { title: true, url: true, generation: true },
      })
    )
  );
  return bySource
    .flat()
    .filter((a): a is typeof a & { title: string } => Boolean(a.title))
    .map((a) => ({
      title: a.title,
      url: a.url,
      summary: a.generation ? parseGeneration(a.generation).summary : undefined,
    }));
}
