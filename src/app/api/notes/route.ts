import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const articleId = new URL(req.url).searchParams.get("articleId") ?? undefined;

  const notes = await prisma.userNote.findMany({
    where: { userId: user.id, ...(articleId ? { articleId } : {}) },
    orderBy: { updatedAt: "desc" },
    include: {
      article: {
        select: { id: true, url: true, title: true, sourceType: true, sourcePublishedAt: true },
      },
    },
  });

  return NextResponse.json({ notes });
}

const createSchema = z.object({
  articleId: z.string().min(1),
  body: z.string().trim().min(1, "メモを入力してください").max(4000, "メモは4000文字以内にしてください"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: parsed.data.articleId } });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const note = await prisma.userNote.create({
    data: { userId: user.id, articleId: parsed.data.articleId, body: parsed.data.body },
    include: {
      article: { select: { id: true, url: true, title: true, sourceType: true, sourcePublishedAt: true } },
    },
  });

  return NextResponse.json({ note });
}
