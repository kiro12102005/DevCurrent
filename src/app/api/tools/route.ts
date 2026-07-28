import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const picks = await prisma.aiToolPick.findMany({
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ picks });
}
