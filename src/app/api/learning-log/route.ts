import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { computeLearningStats } from "@/lib/learningStats";
import { parseGeneration } from "@/lib/summarize";

// One combined "portfolio-ready" document: everything computeLearningStats
// already aggregates, plus the actual saved articles/notes and any GitHub
// repos referenced among the user's read/saved articles - the raw material
// for a "技術の履歴書" a user can paste into a resume/README by hand.
// (Auto-pushing this to an actual GitHub README would need the GitHub OAuth
// integration that's still deferred - this is the manual-export half.)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const [stats, states] = await Promise.all([
    computeLearningStats(user.id),
    prisma.userArticleState.findMany({
      where: { userId: user.id, OR: [{ isRead: true }, { isBookmarked: true }] },
      include: { article: { include: { generation: true } } },
    }),
  ]);

  const notes = await prisma.userNote.findMany({
    where: { userId: user.id, articleId: { in: states.map((s) => s.article.id) } },
  });
  const notesByArticle = new Map<string, string[]>();
  for (const n of notes) {
    notesByArticle.set(n.articleId, [...(notesByArticle.get(n.articleId) ?? []), n.body]);
  }

  const githubRepos = new Set<string>();
  const items = states.map((s) => {
    const insight = s.article.generation ? parseGeneration(s.article.generation) : null;
    if (insight?.githubRepo) githubRepos.add(insight.githubRepo);
    return {
      title: s.article.title ?? s.article.url,
      url: s.article.url,
      sourceType: s.article.sourceType,
      isRead: s.isRead,
      isBookmarked: s.isBookmarked,
      notes: notesByArticle.get(s.article.id) ?? [],
    };
  });

  return NextResponse.json({
    stats,
    githubRepos: [...githubRepos],
    items,
  });
}
