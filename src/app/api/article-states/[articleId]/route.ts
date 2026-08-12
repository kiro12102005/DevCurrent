import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const updateSchema = z.object({
  isRead: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
  isLiked: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ articleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { articleId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (
    !parsed.success ||
    (parsed.data.isRead === undefined && parsed.data.isBookmarked === undefined && parsed.data.isLiked === undefined)
  ) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  // likeCount on Article is a denormalized public counter, so a like toggle
  // needs a second write alongside the per-user state row - only fire it when
  // isLiked actually changes (compare against the pre-existing row, defaulting
  // to false for a first-time interaction) to keep the count accurate.
  const existing = await prisma.userArticleState.findUnique({
    where: { userId_articleId: { userId: user.id, articleId } },
    select: { isLiked: true },
  });
  const wasLiked = existing?.isLiked ?? false;
  const likedChanged = parsed.data.isLiked !== undefined && parsed.data.isLiked !== wasLiked;

  const [state] = await prisma.$transaction([
    prisma.userArticleState.upsert({
      where: { userId_articleId: { userId: user.id, articleId } },
      create: {
        userId: user.id,
        articleId,
        isRead: parsed.data.isRead ?? false,
        isBookmarked: parsed.data.isBookmarked ?? false,
        isLiked: parsed.data.isLiked ?? false,
      },
      update: {
        ...(parsed.data.isRead !== undefined ? { isRead: parsed.data.isRead } : {}),
        ...(parsed.data.isBookmarked !== undefined ? { isBookmarked: parsed.data.isBookmarked } : {}),
        ...(parsed.data.isLiked !== undefined ? { isLiked: parsed.data.isLiked } : {}),
      },
      select: { isRead: true, isBookmarked: true, isLiked: true },
    }),
    ...(likedChanged
      ? [prisma.article.update({ where: { id: articleId }, data: { likeCount: { increment: parsed.data.isLiked ? 1 : -1 } } })]
      : []),
  ]);

  return NextResponse.json({ state });
}
