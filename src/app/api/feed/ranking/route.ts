import { NextResponse } from "next/server";
import { getMonthlyRanking } from "@/lib/monthlyRanking";

export async function GET() {
  const ranking = await getMonthlyRanking();
  return NextResponse.json({ ranking });
}
