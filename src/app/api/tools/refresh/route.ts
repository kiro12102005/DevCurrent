import { NextResponse } from "next/server";
import { refreshAiToolPicks } from "@/lib/curation/aiToolPicks";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Triggers a Gemini-curated refresh of the "AIツール" pickup list (server
// GEMINI_API_KEY - shared content, same reasoning as feed featured picks).
// Call from a scheduler (Vercel Cron / GitHub Actions) or manually.
async function handleRefresh(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshAiToolPicks();
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
