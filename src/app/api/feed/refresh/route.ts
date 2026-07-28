import { NextResponse } from "next/server";
import { refreshFeed } from "@/lib/crawlers/refresh";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Triggers a crawl of all sources, marks top picks as featured, auto-generates
// their insight, and pushes a notification if anything new was featured.
// Call this from a scheduler (Vercel Cron / GitHub Actions) in production, or
// hit it manually. src/instrumentation.ts also calls refreshFeed() on a timer
// for self-hosted/long-running deployments.
async function handleRefresh(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshFeed();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: manual trigger / GitHub Actions (x-cron-secret header).
export async function POST(req: Request) {
  return handleRefresh(req);
}

// GET: Vercel Cron, which sends a GET with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  return handleRefresh(req);
}
