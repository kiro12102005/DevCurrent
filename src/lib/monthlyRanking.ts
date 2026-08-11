import { prisma } from "@/lib/prisma";
import { SourceType } from "@/generated/prisma";
import { jstMonthRange, jstTodayString } from "@/lib/dateRange";
import { ARTICLE_LIST_SELECT, toFeedArticle } from "@/lib/articleSelect";
import type { FeedArticle } from "@/types/feed";

const RANKING_SIZE = 30;

// Unlike the day/week "featured" picks (deliberately balanced per-source, see
// lib/feedQuery.ts), a ranking is a single flat list purely by engagement -
// balancing sources would defeat the point of "what actually won this month".
// Trailing 30 days from today, not calendar-month-aligned (same convention
// as jstWeekRange). GITHUB_TRENDING is excluded - its engagement is GitHub
// star counts (hundreds-to-thousands), an entirely different scale from
// Qiita/Zenn likes or Hacker News points, so a flat cross-source sort would
// let it swamp every other source instead of reflecting "what actually won
// this month" among articles.
export async function getMonthlyRanking(): Promise<FeedArticle[]> {
  const [rangeStart, rangeEnd] = jstMonthRange(jstTodayString());
  const articles = await prisma.article.findMany({
    where: {
      sourceType: { notIn: [SourceType.USER_SUBMITTED, SourceType.GITHUB_TRENDING] },
      sourcePublishedAt: { gte: rangeStart, lt: rangeEnd },
    },
    orderBy: { engagementScore: "desc" },
    take: RANKING_SIZE,
    select: ARTICLE_LIST_SELECT,
  });
  return articles.map(toFeedArticle);
}
