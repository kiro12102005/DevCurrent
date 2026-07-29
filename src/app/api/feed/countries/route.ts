import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Powers the feed's country filter chips - built from whatever countries
// actually exist in the data (not a hardcoded JP/US/CN-only list), so a
// good article from any country Gemini has classified (see COUNTRY_OPTIONS
// in lib/gemini.ts) shows up as a real filter option once it's been crawled.
export async function GET() {
  const rows = await prisma.article.groupBy({
    by: ["country"],
    where: { country: { not: null } },
    _count: true,
    orderBy: { _count: { country: "desc" } },
  });

  const countries = rows.map((r) => r.country).filter((c): c is string => Boolean(c));
  return NextResponse.json({ countries });
}
