import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Unified "保存済み" list: every article the user has bookmarked, each with
// any notes they've written on it. Bookmarking and note-taking used to be two
// separate, overlapping ways to "keep" an article - writing a note now always
// bookmarks too (see POST /api/notes), so this single list covers both.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const states = await prisma.userArticleState.findMany({
    where: { userId: user.id, isBookmarked: true },
    orderBy: { updatedAt: "desc" },
    include: {
      article: { select: { id: true, url: true, title: true, sourceType: true, sourcePublishedAt: true } },
    },
  });

  const articleIds = states.map((s) => s.articleId);
  const notes =
    articleIds.length > 0
      ? await prisma.userNote.findMany({
          where: { userId: user.id, articleId: { in: articleIds } },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  const notesByArticle = new Map<string, typeof notes>();
  for (const note of notes) {
    notesByArticle.set(note.articleId, [...(notesByArticle.get(note.articleId) ?? []), note]);
  }

  const items = states.map((s) => ({
    article: s.article,
    isRead: s.isRead,
    notes: (notesByArticle.get(s.articleId) ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  }));

  return NextResponse.json({ items });
}
