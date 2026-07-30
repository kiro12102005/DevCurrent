import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { translateInsightContent, type TranslationLanguage } from "@/lib/gemini";
import { parseGeneration } from "@/lib/summarize";
import type { AIGeneration } from "@/generated/prisma";
import type { Insight } from "@/types/insight";

export function isTranslationLanguage(lang: unknown): lang is TranslationLanguage {
  return lang === "en" || lang === "zh";
}

type GenerationRow = Pick<AIGeneration, "id" | "summary" | "prosAndCons" | "glossary">;

interface CachedProsAndCons {
  pros: string[];
  cons: string[];
  outlook: string;
  breakingChangeSummary: string | null;
  debateMatrix: { pro: string[]; con: string[] } | null;
}

// Returns the insight translated into `lang`, backed by a DB cache
// (AIGenerationTranslation) so Gemini is only ever called once per
// (article, language) - see docs/DESIGN_DECISIONS.md's i18n section.
// githubRepo/isBreakingChange pass through untranslated from the base
// Japanese generation, since a repo path and a boolean flag aren't
// language-dependent.
export async function getTranslatedInsight(generation: GenerationRow, lang: TranslationLanguage): Promise<Insight> {
  const base = parseGeneration(generation);

  const cached = await prisma.aIGenerationTranslation.findUnique({
    where: { aiGenerationId_language: { aiGenerationId: generation.id, language: lang } },
  });

  if (cached) {
    const prosAndCons = JSON.parse(cached.prosAndCons) as CachedProsAndCons;
    return {
      ...base,
      summary: cached.summary,
      pros: prosAndCons.pros,
      cons: prosAndCons.cons,
      outlook: prosAndCons.outlook,
      breakingChangeSummary: prosAndCons.breakingChangeSummary,
      debateMatrix: prosAndCons.debateMatrix,
      glossary: JSON.parse(cached.glossary) as Insight["glossary"],
    };
  }

  const translated = await translateInsightContent(
    {
      summary: base.summary,
      pros: base.pros,
      cons: base.cons,
      outlook: base.outlook,
      breakingChangeSummary: base.breakingChangeSummary,
      debateMatrix: base.debateMatrix,
      glossary: base.glossary,
    },
    lang
  );

  try {
    await prisma.aIGenerationTranslation.create({
      data: {
        aiGenerationId: generation.id,
        language: lang,
        summary: translated.summary,
        prosAndCons: JSON.stringify({
          pros: translated.pros,
          cons: translated.cons,
          outlook: translated.outlook,
          breakingChangeSummary: translated.breakingChangeSummary,
          debateMatrix: translated.debateMatrix,
        } satisfies CachedProsAndCons),
        glossary: JSON.stringify(translated.glossary),
      },
    });
  } catch (err) {
    // P2002 = a concurrent request already cached this same translation first
    // - fine, the DB has a valid row either way (same race pattern as
    // persistInsight in lib/summarize.ts).
    const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) throw err;
  }

  return { ...base, ...translated };
}
