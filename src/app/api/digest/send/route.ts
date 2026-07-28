import { NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Unlike /api/feed/refresh and /api/tools/refresh, there is no in-app button
// that hits this route - sending real email to real users should never be
// something any visitor can trigger by POSTing to a guessable URL. Only GET
// (Vercel Cron / GitHub Actions, both of which send CRON_SECRET) is accepted.
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyDigest();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "送信に失敗しました" },
      { status: 500 }
    );
  }
}
