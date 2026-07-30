import { NextResponse } from "next/server";
import { sendUsageDigest } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Same GET-only, cron-secret-gated pattern as /api/digest/send - this sends
// real email too, so no in-app button should ever be able to trigger it.
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendUsageDigest();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/usage-digest/send] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "送信に失敗しました" },
      { status: 500 }
    );
  }
}
