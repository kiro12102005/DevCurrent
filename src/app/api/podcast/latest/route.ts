import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const episode = await prisma.podcastEpisode.findFirst({
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ episode });
}
