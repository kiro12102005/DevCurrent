import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { jstTodayString } from "@/lib/dateRange";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeedPage, DATE_PATTERN } from "@/lib/feedQuery";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "day" ? "day" : "week";
  const rawDate = searchParams.get("date");
  // A malformed date (or arbitrary string) would otherwise reach `new Date(...)`
  // inside jstDayRange/jstWeekRange as an Invalid Date, which Prisma then
  // rejects with a 500 instead of a clean 400 - validate the shape up front.
  if (rawDate !== null && !DATE_PATTERN.test(rawDate)) {
    return NextResponse.json({ error: "不正な日付形式です（YYYY-MM-DD）" }, { status: 400 });
  }
  const date = rawDate || jstTodayString();
  const regularOffset = Math.max(0, Number(searchParams.get("regularOffset") ?? "0") || 0);
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const bookmarkedOnly = searchParams.get("bookmarkedOnly") === "1";
  const country = searchParams.get("country");

  // read/bookmark filters are per-user, so they're a no-op for logged-out
  // requests (nothing to filter against) rather than an error.
  const user = unreadOnly || bookmarkedOnly ? await getCurrentUser() : null;
  const stateFilter: Prisma.ArticleWhereInput = user
    ? {
        ...(unreadOnly ? { userStates: { none: { userId: user.id, isRead: true } } } : {}),
        ...(bookmarkedOnly ? { userStates: { some: { userId: user.id, isBookmarked: true } } } : {}),
      }
    : {};

  const result = await getFeedPage({ period, date, regularOffset, country, stateFilter });
  return NextResponse.json(result);
}
