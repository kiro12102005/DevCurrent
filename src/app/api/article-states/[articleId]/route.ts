import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const updateSchema = z.object({
  isRead: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ articleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { articleId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || (parsed.data.isRead === undefined && parsed.data.isBookmarked === undefined)) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const state = await prisma.userArticleState.upsert({
    where: { userId_articleId: { userId: user.id, articleId } },
    create: {
      userId: user.id,
      articleId,
      isRead: parsed.data.isRead ?? false,
      isBookmarked: parsed.data.isBookmarked ?? false,
    },
    update: {
      ...(parsed.data.isRead !== undefined ? { isRead: parsed.data.isRead } : {}),
      ...(parsed.data.isBookmarked !== undefined ? { isBookmarked: parsed.data.isBookmarked } : {}),
    },
    select: { isRead: true, isBookmarked: true },
  });

  return NextResponse.json({ state });
}
