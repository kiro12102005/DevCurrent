import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourceType, type Prisma } from "@/generated/prisma";
import { ARTICLE_LIST_SELECT, toFeedArticle } from "@/lib/articleSelect";
import { getCurrentUser } from "@/lib/auth/session";

const PAGE_SIZE = 30;
const MIN_QUERY_LENGTH = 2; // avoid a full-table scan on a single keystroke

// Unlike /api/feed (bounded to a day/week), search spans every crawled
// article ever seen - there's no "featured" concept here (that's a
// day/week engagement ranking, which doesn't mean anything across all time).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const bookmarkedOnly = searchParams.get("bookmarkedOnly") === "1";

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ query: q, results: [], offset: 0, count: 0, total: 0, hasMore: false });
  }

  const user = unreadOnly || bookmarkedOnly ? await getCurrentUser() : null;

  const where: Prisma.ArticleWhereInput = {
    sourceType: { not: SourceType.USER_SUBMITTED },
    title: { contains: q, mode: "insensitive" as const },
    ...(user
      ? {
          ...(unreadOnly ? { userStates: { none: { userId: user.id, isRead: true } } } : {}),
          ...(bookmarkedOnly ? { userStates: { some: { userId: user.id, isBookmarked: true } } } : {}),
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { sourcePublishedAt: "desc" },
      skip: offset,
      take: PAGE_SIZE,
      select: ARTICLE_LIST_SELECT,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    query: q,
    results: results.map(toFeedArticle),
    offset,
    count: offset + results.length,
    total,
    hasMore: offset + results.length < total,
  });
}
