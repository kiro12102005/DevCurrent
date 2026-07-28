import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { shareSlug: true, publicNickname: true },
  });
  return NextResponse.json({ share: full });
}

const updateSchema = z.object({
  enabled: z.boolean(),
  publicNickname: z.string().trim().max(30).optional(),
});

// Deliberately not the user id - a public, guessable-but-not-enumerable slug
// so the share page can't be used to enumerate real accounts.
function generateSlug(): string {
  return randomBytes(9).toString("base64url");
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { shareSlug: true } });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      shareSlug: parsed.data.enabled ? (current?.shareSlug ?? generateSlug()) : null,
      ...(parsed.data.publicNickname !== undefined ? { publicNickname: parsed.data.publicNickname || null } : {}),
    },
    select: { shareSlug: true, publicNickname: true },
  });

  return NextResponse.json({ share: updated });
}
