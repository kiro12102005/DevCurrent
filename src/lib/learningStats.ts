import { prisma } from "@/lib/prisma";
import { TAG_OPTIONS } from "@/lib/tags";

const ACTIVE_WINDOW_DAYS = 30;

export interface LearningStats {
  readCount: number;
  savedCount: number;
  activeDaysLast30: number;
  tags: { tag: string; count: number }[];
}

// Shared by GET /api/learning-map (the logged-in user's own view) and the
// public /u/[slug] share page (someone else's stats, read-only) so the two
// never drift out of sync.
export async function computeLearningStats(userId: string): Promise<LearningStats> {
  const states = await prisma.userArticleState.findMany({
    where: { userId, OR: [{ isRead: true }, { isBookmarked: true }] },
    select: { isRead: true, isBookmarked: true, updatedAt: true, article: { select: { tags: true } } },
  });

  const tagCounts: Record<string, number> = Object.fromEntries(TAG_OPTIONS.map((t) => [t, 0]));
  const activeDays = new Set<string>();
  let readCount = 0;
  let savedCount = 0;
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  for (const s of states) {
    if (s.isRead) readCount++;
    if (s.isBookmarked) savedCount++;
    for (const tag of s.article.tags) {
      if (tag in tagCounts) tagCounts[tag]++;
    }
    if (s.updatedAt >= cutoff) {
      activeDays.add(s.updatedAt.toISOString().slice(0, 10));
    }
  }

  return {
    readCount,
    savedCount,
    activeDaysLast30: activeDays.size,
    tags: TAG_OPTIONS.map((tag) => ({ tag, count: tagCounts[tag] })),
  };
}
