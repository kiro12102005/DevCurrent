import { prisma } from "@/lib/prisma";

const WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

interface UsageForRange {
  newUsers: number;
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

// Shared by the live /admin/usage page (trailing 7 days) and the monthly
// email digest (whole month + a per-week breakdown within it) - same five
// metrics, just different [start, end) ranges.
async function computeUsageForRange(start: Date, end: Date, includeTopArticles: boolean): Promise<UsageForRange> {
  const [newUsers, activeUserRows, urlSummariesGenerated, newArticlesCrawled, feedbackCount, topArticles] =
    await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.userArticleState.findMany({
        where: { updatedAt: { gte: start, lt: end } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.aIGeneration.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.article.count({ where: { fetchedAt: { gte: start, lt: end } } }),
      prisma.feedback.count({ where: { createdAt: { gte: start, lt: end } } }),
      includeTopArticles
        ? prisma.article.findMany({
            where: { fetchedAt: { gte: start, lt: end }, engagementScore: { not: null } },
            orderBy: { engagementScore: "desc" },
            take: 5,
            select: { title: true, url: true, engagementScore: true, sourceType: true },
          })
        : Promise.resolve([]),
    ]);

  return {
    newUsers,
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

export interface WeeklyUsageStats extends UsageForRange {
  windowStart: Date;
  windowEnd: Date;
  totalUsers: number;
}

// Deliberately computed from our own Postgres data rather than the Vercel
// Analytics API - Web Analytics has no read API on the Hobby plan, so
// pageview/visitor counts stay dashboard-only (see docs/DEPLOY.md section
// 5.5). This covers what we *can* measure ourselves: signups, engaged users,
// and BYOK feature usage, which is what actually indicates retention. Used by
// the live /admin/usage page (see computeMonthlyUsageStats for the emailed
// digest, which covers a full month broken down by week).
export async function computeWeeklyUsageStats(): Promise<WeeklyUsageStats> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * DAY_MS);

  const [totalUsers, usage] = await Promise.all([prisma.user.count(), computeUsageForRange(windowStart, windowEnd, true)]);

  return { windowStart, windowEnd, totalUsers, ...usage };
}

export interface WeeklyBucketStats extends Omit<UsageForRange, "topArticles"> {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
}

export interface MonthlyUsageStats extends UsageForRange {
  monthStart: Date;
  monthEnd: Date;
  totalUsers: number;
  weeks: WeeklyBucketStats[];
}

// Same metrics as computeWeeklyUsageStats but over the trailing month, plus
// a per-week breakdown within it (7-day slices from monthStart; the last
// slice is shorter than 7 days for 29-31 day months). Assumes it's invoked
// on the 1st of the month (see the monthly cron in vercel.json) - monthStart
// is exactly one calendar month before monthEnd, which only lands on a
// same-numbered day safely when that day is the 1st.
export async function computeMonthlyUsageStats(): Promise<MonthlyUsageStats> {
  const monthEnd = new Date();
  const monthStart = new Date(monthEnd);
  monthStart.setMonth(monthStart.getMonth() - 1);

  const weekRanges: { start: Date; end: Date }[] = [];
  for (let cursor = monthStart.getTime(); cursor < monthEnd.getTime(); ) {
    const end = Math.min(cursor + WEEK_MS, monthEnd.getTime());
    weekRanges.push({ start: new Date(cursor), end: new Date(end) });
    cursor = end;
  }

  const [totalUsers, monthUsage, weeks] = await Promise.all([
    prisma.user.count(),
    computeUsageForRange(monthStart, monthEnd, true),
    Promise.all(
      weekRanges.map(async (range, i) => {
        const usage = await computeUsageForRange(range.start, range.end, false);
        const { topArticles: _topArticles, ...weeklyUsage } = usage;
        return { weekLabel: `第${i + 1}週`, weekStart: range.start, weekEnd: range.end, ...weeklyUsage };
      })
    ),
  ]);

  return { monthStart, monthEnd, totalUsers, ...monthUsage, weeks };
}
