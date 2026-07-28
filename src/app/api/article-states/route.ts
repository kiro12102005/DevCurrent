import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Batch-fetch read/bookmark state for a page of articles in one request,
// rather than one request per FeedCard. Returns an empty map for logged-out
// users (the UI just hides the toggle buttons in that case).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ states: {} });
  }

  const idsParam = new URL(req.url).searchParams.get("articleIds") ?? "";
  const articleIds = idsParam.split(",").filter(Boolean);
  if (articleIds.length === 0) {
    return NextResponse.json({ states: {} });
  }

  const rows = await prisma.userArticleState.findMany({
    where: { userId: user.id, articleId: { in: articleIds } },
    select: { articleId: true, isRead: true, isBookmarked: true },
  });

  const states: Record<string, { isRead: boolean; isBookmarked: boolean }> = {};
  for (const row of rows) {
    states[row.articleId] = { isRead: row.isRead, isBookmarked: row.isBookmarked };
  }

  return NextResponse.json({ states });
}
