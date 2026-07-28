import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { TAG_OPTIONS } from "@/lib/tags";

const MAX_STACK_KEYWORDS = 15;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { interestTags: true, stackKeywords: true, wantsWeeklyDigest: true },
  });

  return NextResponse.json({ preferences: full });
}

const updateSchema = z.object({
  interestTags: z.array(z.enum(TAG_OPTIONS)).optional(),
  stackKeywords: z.array(z.string().trim().min(1).max(40)).max(MAX_STACK_KEYWORDS).optional(),
  wantsWeeklyDigest: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: { interestTags: true, stackKeywords: true, wantsWeeklyDigest: true },
  });

  return NextResponse.json({ preferences: updated });
}
