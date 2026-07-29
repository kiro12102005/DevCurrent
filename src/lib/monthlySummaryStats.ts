import { prisma } from "@/lib/prisma";
import { TAG_OPTIONS } from "@/lib/tags";

const WINDOW_DAYS = 30;

export interface MonthlySummaryStats {
  readCount: number;
  savedCount: number;
  activeDays: number;
  topTag: string | null;
}

// Unlike computeLearningStats() (all-time totals, used for the public share
// page), this is scoped to the trailing 30 days only - it powers a "your
// month in review" shareable image, so an all-time total would defeat the
// point of "what did I actually do this month".
export async function computeMonthlySummaryStats(userId: string): Promise<MonthlySummaryStats> {
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const states = await prisma.userArticleState.findMany({
    where: { userId, updatedAt: { gte: cutoff }, OR: [{ isRead: true }, { isBookmarked: true }] },
    select: { isRead: true, isBookmarked: true, updatedAt: true, article: { select: { tags: true } } },
  });

  const tagCounts: Record<string, number> = Object.fromEntries(TAG_OPTIONS.map((t) => [t, 0]));
  const activeDays = new Set<string>();
  let readCount = 0;
  let savedCount = 0;

  for (const s of states) {
    if (s.isRead) readCount++;
    if (s.isBookmarked) savedCount++;
    for (const tag of s.article.tags) {
      if (tag in tagCounts) tagCounts[tag]++;
    }
    activeDays.add(s.updatedAt.toISOString().slice(0, 10));
  }

  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    readCount,
    savedCount,
    activeDays: activeDays.size,
    topTag: topTag && topTag[1] > 0 ? topTag[0] : null,
  };
}
