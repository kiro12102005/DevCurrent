import { NextResponse } from "next/server";
import { generateDailyEpisode } from "@/lib/podcast";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Same protection level as /api/digest/send: no in-app button triggers this
// (unlike feed/tools refresh), and TTS generation is the most expensive
// operation in this app, so it stays GET + CRON_SECRET-only, never an open POST.
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateDailyEpisode();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[podcast/generate] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成に失敗しました" },
      { status: 500 }
    );
  }
}
