import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PodcastSourceArticle } from "@/types/podcast";

export async function GET() {
  const row = await prisma.podcastEpisode.findFirst({
    orderBy: { date: "desc" },
  });
  if (!row) {
    return NextResponse.json({ episode: null });
  }

  let sourceArticles: PodcastSourceArticle[] = [];
  try {
    sourceArticles = JSON.parse(row.sourceArticles);
  } catch {
    // older episodes predating this field, or a parse failure - degrade to an empty list rather than erroring
  }

  return NextResponse.json({ episode: { ...row, sourceArticles } });
}
