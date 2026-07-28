import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);

  const user = await getCurrentUser();

  const [rows, total] = await Promise.all([
    prisma.aiToolPick.findMany({
      orderBy: { publishedAt: "desc" },
      skip: offset,
      take: PAGE_SIZE,
    }),
    prisma.aiToolPick.count(),
  ]);

  let bookmarkedIds = new Set<string>();
  if (user && rows.length > 0) {
    const bookmarks = await prisma.userToolBookmark.findMany({
      where: { userId: user.id, toolId: { in: rows.map((r) => r.id) } },
      select: { toolId: true },
    });
    bookmarkedIds = new Set(bookmarks.map((b) => b.toolId));
  }

  const picks = rows.map((r) => ({ ...r, isBookmarked: bookmarkedIds.has(r.id) }));

  return NextResponse.json({
    picks,
    offset,
    count: offset + rows.length,
    total,
    hasMore: offset + rows.length < total,
  });
}
