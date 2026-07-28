import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { generateInterviewQuestions } from "@/lib/gemini";
import { parseGeneration } from "@/lib/summarize";

const MAX_ARTICLES = 12; // caps prompt size + keeps the question set focused on recent interests

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const states = await prisma.userArticleState.findMany({
    where: { userId: user.id, isBookmarked: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_ARTICLES,
    include: {
      article: { include: { generation: true } },
    },
  });

  if (states.length === 0) {
    return NextResponse.json(
      { error: "保存済みの記事がありません。フィードで記事を保存してから試してください。" },
      { status: 400 }
    );
  }

  const articles = states.map((s) => ({
    title: s.article.title ?? s.article.url,
    summary: s.article.generation ? parseGeneration(s.article.generation).summary : undefined,
  }));

  const apiKey = req.headers.get("x-gemini-api-key") ?? undefined;
  try {
    const questions = await generateInterviewQuestions(articles, apiKey);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[interview/generate] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成に失敗しました" },
      { status: 502 }
    );
  }
}
