import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const bodySchema = z.object({ isBookmarked: z.boolean() });

export async function PUT(req: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { toolId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  if (parsed.data.isBookmarked) {
    const tool = await prisma.aiToolPick.findUnique({ where: { id: toolId }, select: { id: true } });
    if (!tool) {
      return NextResponse.json({ error: "ツールが見つかりません" }, { status: 404 });
    }
    await prisma.userToolBookmark.upsert({
      where: { userId_toolId: { userId: user.id, toolId } },
      create: { userId: user.id, toolId },
      update: {},
    });
  } else {
    await prisma.userToolBookmark.deleteMany({ where: { userId: user.id, toolId } });
  }

  return NextResponse.json({ isBookmarked: parsed.data.isBookmarked });
}
