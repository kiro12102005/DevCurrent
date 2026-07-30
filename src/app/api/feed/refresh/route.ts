import { NextResponse } from "next/server";
import { refreshFeed } from "@/lib/crawlers/refresh";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";
import { recordAndCheckAbuse } from "@/lib/abuseAlert";

// Triggers a crawl of all sources, marks top picks as featured, auto-generates
// their insight, and pushes a notification if anything new was featured.
// src/instrumentation.ts also calls refreshFeed() on a timer for
// self-hosted/long-running deployments.
async function handleRefresh() {
  try {
    const result = await refreshFeed();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[feed/refresh] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: intentionally unauthenticated - this is also what the in-app "今すぐ更新"
// button hits directly from the browser (see FeedList.tsx), so it can't require a
// server-only secret. GitHub Actions calls this too (its x-cron-secret header is
// simply ignored here). Safe to leave open: refreshFeed() is idempotent (upserts
// by urlHash) and bounds its own Gemini spend to a handful of featured picks per run.
export async function POST(req: Request) {
  recordAndCheckAbuse(req, "/api/feed/refresh");
  return handleRefresh();
}

// GET: Vercel Cron only (nothing in the UI calls GET on this route), which sends
// "Authorization: Bearer $CRON_SECRET" automatically - keep this one authenticated.
export async function GET(req: Request) {
  recordAndCheckAbuse(req, "/api/feed/refresh");
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return handleRefresh();
}
