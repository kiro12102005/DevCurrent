import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Feed/saved pages fetch at most a couple dozen articles per request in
// normal use - a much larger list is either a bug or someone probing for a
// large unbounded IN-clause query, so cap it rather than trusting the client.
const MAX_ARTICLE_IDS = 200;

// Batch-fetch read/bookmark state for a page of articles in one request,
// rather than one request per FeedCard. Returns an empty map for logged-out
// users (the UI just hides the toggle buttons in that case).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ states: {} });
  }

  const idsParam = new URL(req.url).searchParams.get("articleIds") ?? "";
  const articleIds = idsParam.split(",").filter(Boolean).slice(0, MAX_ARTICLE_IDS);
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
