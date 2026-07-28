import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { computeLearningStats } from "@/lib/learningStats";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const stats = await computeLearningStats(user.id);
  return NextResponse.json(stats);
}
