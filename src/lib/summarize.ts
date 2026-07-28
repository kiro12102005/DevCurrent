import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { sha256 } from "@/lib/hash";
import { scrapeArticle } from "@/lib/scrape";
import { generateInsight, type GeneratedInsight, type DebateMatrix } from "@/lib/gemini";
import type { AIGeneration } from "@/generated/prisma";
import type { Insight } from "@/types/insight";

type GenerationRow = Pick<AIGeneration, "summary" | "prosAndCons" | "glossary">;

export function parseGeneration(generation: GenerationRow): Insight {
  const { pros, cons, outlook, githubRepo, isBreakingChange, breakingChangeSummary, debateMatrix } = JSON.parse(
    generation.prosAndCons
  ) as {
    pros: string[];
    cons: string[];
    outlook: string;
    githubRepo?: string | null;
    isBreakingChange?: boolean;
    breakingChangeSummary?: string | null;
    debateMatrix?: DebateMatrix | null;
  };
  return {
    summary: generation.summary,
    pros,
    cons,
    outlook,
    githubRepo: githubRepo ?? null,
    isBreakingChange: isBreakingChange ?? false,
    breakingChangeSummary: breakingChangeSummary ?? null,
    debateMatrix: debateMatrix ?? null,
    glossary: JSON.parse(generation.glossary) as Insight["glossary"],
  };
}

// Applied after the fact (unlike the other insight fields, which are all
// generated together in one Gemini call) - the debate matrix depends on a
// Hacker News comment fetch that only runs for a subset of featured articles
// (see refresh.ts), so it's merged into the existing prosAndCons blob rather
// than threaded through generateInsight's single request/response shape.
export async function persistDebateMatrix(articleId: string, matrix: DebateMatrix): Promise<void> {
  const generation = await prisma.aIGeneration.findUnique({ where: { articleId }, select: { prosAndCons: true } });
  if (!generation) return;

  const parsed = JSON.parse(generation.prosAndCons) as Record<string, unknown>;
  await prisma.aIGeneration.update({
    where: { articleId },
    data: { prosAndCons: JSON.stringify({ ...parsed, debateMatrix: matrix }) },
  });
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
          isBreakingChange: insight.isBreakingChange,
          breakingChangeSummary: insight.breakingChangeSummary,
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
  // debateMatrix isn't part of generateInsight's single call - it's added
  // afterward for a subset of articles (see refresh.ts) - so it's never
  // populated yet at this specific return point.
  return { ...insight, debateMatrix: null };
}
