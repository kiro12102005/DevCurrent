import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { sha256 } from "@/lib/hash";
import { scrapeArticle } from "@/lib/scrape";
import { generateInsight, type GeneratedInsight } from "@/lib/gemini";
import type { AIGeneration } from "@/generated/prisma";
import type { Insight } from "@/types/insight";

type GenerationRow = Pick<AIGeneration, "summary" | "prosAndCons" | "glossary">;

export function parseGeneration(generation: GenerationRow): Insight {
  const { pros, cons, outlook, githubRepo } = JSON.parse(generation.prosAndCons) as {
    pros: string[];
    cons: string[];
    outlook: string;
    githubRepo?: string | null;
  };
  return {
    summary: generation.summary,
    pros,
    cons,
    outlook,
    githubRepo: githubRepo ?? null,
    glossary: JSON.parse(generation.glossary) as Insight["glossary"],
  };
}

// Shared DB-write step used by both the on-demand /api/summarize route and the
// automatic feed refresh job, so the cache row shape only has one source of truth.
export async function persistInsight(
  articleId: string,
  scraped: { title: string; text: string },
  insight: GeneratedInsight
): Promise<void> {
  const contentHash = sha256(scraped.text);

  await prisma.article.update({
    where: { id: articleId },
    // Prefer the AI-normalized Japanese title/country over the raw scraped
    // ones (title is often English for Hacker News / ArXiv sources; country
    // is a higher-confidence guess here since it's based on the full article
    // text, not just the title) so they're consistent everywhere they're shown.
    data: {
      title: insight.japaneseTitle || scraped.title,
      country: insight.country && insight.country !== "不明" ? insight.country : undefined,
      rawText: scraped.text,
      contentHash,
    },
  });

  try {
    await prisma.aIGeneration.create({
      data: {
        articleId,
        summary: insight.summary,
        prosAndCons: JSON.stringify({
          pros: insight.pros,
          cons: insight.cons,
          outlook: insight.outlook,
          githubRepo: insight.githubRepo,
        }),
        glossary: JSON.stringify(insight.glossary),
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation on articleId - a concurrent request
    // (e.g. React Strict Mode double-firing an effect) already generated and
    // saved this article first. That's fine: the DB has a valid generation
    // either way, so swallow the race instead of crashing the request.
    const isDuplicateGeneration =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicateGeneration) throw err;
  }
}

// All-in-one scrape -> generate -> persist, for callers that don't need to
// distinguish "scrape failed" from "generation failed" (e.g. the batch feed job).
export async function generateInsightForArticle(
  article: { id: string; url: string },
  apiKey?: string
): Promise<Insight> {
  const scraped = await scrapeArticle(article.url);
  const insight = await generateInsight({ title: scraped.title, text: scraped.text, apiKey });
  await persistInsight(article.id, scraped, insight);
  return insight;
}
