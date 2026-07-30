import { prisma } from "@/lib/prisma";

const WINDOW_DAYS = 7;

export interface WeeklyUsageStats {
  windowStart: Date;
  windowEnd: Date;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
  urlSummariesGenerated: number;
  newArticlesCrawled: number;
  feedbackCount: number;
  topArticles: {
    title: string;
    url: string;
    engagementScore: number | null;
    sourceType: string;
  }[];
}

// Deliberately computed from our own Postgres data rather than the Vercel
// Analytics API - Web Analytics has no read API on the Hobby plan, so
// pageview/visitor counts stay dashboard-only (see docs/DEPLOY.md section
// 5.5). This covers what we *can* measure ourselves: signups, engaged users,
// and BYOK feature usage, which is what actually indicates retention.
export async function computeWeeklyUsageStats(): Promise<WeeklyUsageStats> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [newUsers, totalUsers, activeUserRows, urlSummariesGenerated, newArticlesCrawled, feedbackCount, topArticles] =
    await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: windowStart } } }),
      prisma.user.count(),
      prisma.userArticleState.findMany({
        where: { updatedAt: { gte: windowStart } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.aIGeneration.count({ where: { createdAt: { gte: windowStart } } }),
      prisma.article.count({ where: { fetchedAt: { gte: windowStart } } }),
      prisma.feedback.count({ where: { createdAt: { gte: windowStart } } }),
      prisma.article.findMany({
        where: { fetchedAt: { gte: windowStart }, engagementScore: { not: null } },
        orderBy: { engagementScore: "desc" },
        take: 5,
        select: { title: true, url: true, engagementScore: true, sourceType: true },
      }),
    ]);

  return {
    windowStart,
    windowEnd,
    newUsers,
    totalUsers,
    activeUsers: activeUserRows.length,
    urlSummariesGenerated,
    newArticlesCrawled,
    feedbackCount,
    topArticles: topArticles.map((a) => ({
      title: a.title ?? "(無題)",
      url: a.url,
      engagementScore: a.engagementScore,
      sourceType: a.sourceType,
    })),
  };
}
