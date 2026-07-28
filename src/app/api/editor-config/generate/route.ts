import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateEditorConfig } from "@/lib/gemini";
import { parseGeneration } from "@/lib/summarize";

const requestSchema = z.object({
  articleId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({
    where: { id: parsed.data.articleId },
    include: { generation: true },
  });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const apiKey = req.headers.get("x-gemini-api-key") ?? undefined;
  try {
    const files = await generateEditorConfig(
      {
        title: article.title ?? article.url,
        summary: article.generation ? parseGeneration(article.generation).summary : undefined,
      },
      apiKey
    );
    return NextResponse.json({ files });
  } catch (err) {
    console.error("[editor-config/generate] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成に失敗しました" },
      { status: 502 }
    );
  }
}
