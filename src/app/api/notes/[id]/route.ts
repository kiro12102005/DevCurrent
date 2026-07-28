import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const updateSchema = z.object({
  body: z.string().trim().min(1, "メモを入力してください").max(4000, "メモは4000文字以内にしてください"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }

  const existing = await prisma.userNote.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "メモが見つかりません" }, { status: 404 });
  }

  const note = await prisma.userNote.update({
    where: { id },
    data: { body: parsed.data.body },
    include: {
      article: { select: { id: true, url: true, title: true, sourceType: true, sourcePublishedAt: true } },
    },
  });

  return NextResponse.json({ note });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.userNote.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "メモが見つかりません" }, { status: 404 });
  }

  await prisma.userNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
