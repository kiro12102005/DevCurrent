import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeUrl, sha256 } from "@/lib/hash";
import { scrapeArticle } from "@/lib/scrape";
import { generateInsight } from "@/lib/gemini";
import { parseGeneration, persistInsight } from "@/lib/summarize";
import { getTranslatedInsight } from "@/lib/translate";

const requestSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
  lang: z.enum(["en", "zh"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }

  const normalizedUrl = normalizeUrl(parsed.data.url);
  const urlHash = sha256(normalizedUrl);

  // 1. cache check - never call Gemini twice for the same URL
  const existing = await prisma.article.findUnique({
    where: { urlHash },
    include: { generation: true },
  });

  if (existing?.generation) {
    const insight = parsed.data.lang
      ? await getTranslatedInsight(existing.generation, parsed.data.lang)
      : parseGeneration(existing.generation);
    return NextResponse.json({
      cached: true,
      article: {
        id: existing.id,
        title: existing.title,
        url: existing.url,
        sourceType: existing.sourceType,
        publishedAt: existing.sourcePublishedAt?.toISOString() ?? null,
        country: existing.country,
      },
      insight,
    });
  }

  // 2. scrape
  let scraped;
  try {
    scraped = await scrapeArticle(normalizedUrl);
  } catch (err) {
    console.error("[summarize] scrape failed:", normalizedUrl, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "記事の取得に失敗しました" },
      { status: 422 }
    );
  }

  // 3. generate via Gemini, using the requester's own API key (BYOK)
  // so usage/cost is attributed to them, not shared across all app users.
  const apiKey = req.headers.get("x-gemini-api-key") ?? undefined;
  let insight;
  try {
    insight = await generateInsight({ title: scraped.title, text: scraped.text, apiKey });
  } catch (err) {
    console.error("[summarize] generation failed:", normalizedUrl, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI生成に失敗しました" },
      { status: 502 }
    );
  }

  // 4. persist article + generation together so future requests hit the cache.
  // upsert (not create) because the row may already exist as a bare entry from
  // the feed crawler, or a concurrent duplicate request (e.g. React Strict
  // Mode double-firing an effect) may have just created it - a plain create()
  // would throw on the unique urlHash and crash the request with a
  // non-JSON response, which is what broke the client's res.json() call.
  let article;
  try {
    article = await prisma.article.upsert({
      where: { urlHash },
      create: { url: normalizedUrl, urlHash },
      update: {},
    });
    await persistInsight(article.id, scraped, insight);
  } catch (err) {
    console.error("[summarize] persist failed:", normalizedUrl, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存に失敗しました" },
      { status: 500 }
    );
  }

  // Translation needs the persisted AIGeneration row's id (persistInsight()
  // doesn't return it), so this only re-fetches when a non-Japanese language
  // was actually requested - the common case skips the extra round trip.
  let responseInsight: typeof insight | Awaited<ReturnType<typeof getTranslatedInsight>> = insight;
  if (parsed.data.lang) {
    const generation = await prisma.aIGeneration.findUniqueOrThrow({ where: { articleId: article.id } });
    responseInsight = await getTranslatedInsight(generation, parsed.data.lang);
  }

  return NextResponse.json({
    cached: false,
    article: {
      id: article.id,
      title: insight.japaneseTitle || scraped.title,
      url: article.url,
      sourceType: article.sourceType,
      publishedAt: article.sourcePublishedAt?.toISOString() ?? null,
      // read from the just-generated insight, not `article` - persistInsight()
      // writes country in a separate update() call after this upsert() ran
      country: insight.country && insight.country !== "不明" ? insight.country : (article.country ?? null),
    },
    insight: responseInsight,
  });
}
