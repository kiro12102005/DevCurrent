import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateHandsOnCode } from "@/lib/gemini";
import { parseGeneration } from "@/lib/summarize";

const requestSchema = z.object({
  articleId: z.string().min(1),
});

// CodeSandbox's documented "define" API - a single unauthenticated POST that
// returns a sandbox_id, no account/API key needed. If this fails for any
// reason (network hiccup, API change), we still return the generated code -
// the sandbox link is a bonus, not a requirement for the feature to be useful.
async function tryCreateSandbox(files: { path: string; content: string }[]): Promise<string | null> {
  try {
    const fileMap: Record<string, { content: string }> = {};
    for (const f of files) fileMap[f.path] = { content: f.content };

    const res = await fetch("https://codesandbox.io/api/v1/sandboxes/define?json=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: fileMap }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sandbox_id ? `https://codesandbox.io/s/${data.sandbox_id}` : null;
  } catch {
    return null;
  }
}

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
    const code = await generateHandsOnCode(
      {
        title: article.title ?? article.url,
        summary: article.generation ? parseGeneration(article.generation).summary : undefined,
      },
      apiKey
    );

    const sandboxUrl = code.isWebPlayable && code.files.length > 0 ? await tryCreateSandbox(code.files) : null;

    return NextResponse.json({ code, sandboxUrl });
  } catch (err) {
    console.error("[hands-on/generate] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成に失敗しました" },
      { status: 502 }
    );
  }
}
