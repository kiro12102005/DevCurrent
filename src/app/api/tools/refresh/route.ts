import { NextResponse } from "next/server";
import { refreshAiToolPicks } from "@/lib/curation/aiToolPicks";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Triggers a Gemini-curated refresh of the "AIツール" pickup list (server
// GEMINI_API_KEY - shared content, same reasoning as feed featured picks).
async function handleRefresh() {
  try {
    const result = await refreshAiToolPicks();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[tools/refresh] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: intentionally unauthenticated - this is also what the in-app "更新する"
// button hits directly from the browser (see AiToolPicks.tsx), so it can't
// require a server-only secret. GitHub Actions calls this too (its
// x-cron-secret header is simply ignored here). Safe to leave open:
// refreshAiToolPicks() upserts by name, so repeat calls just refresh the same rows.
export async function POST() {
  return handleRefresh();
}

// GET: Vercel Cron only (nothing in the UI calls GET on this route), which sends
// "Authorization: Bearer $CRON_SECRET" automatically - keep this one authenticated.
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return handleRefresh();
}
