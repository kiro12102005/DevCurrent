import { prisma } from "@/lib/prisma";
import { parseGeneration } from "@/lib/summarize";
import type { RepoCheckMatch } from "@/types/repoCheck";

// npm package name -> the human-readable keyword this app's breaking-change
// detection actually writes into article titles/summaries (see gemini.ts's
// isBreakingChange prompt). Unlisted packages fall back to their raw name,
// which still works for substring matching but misses cases where the
// article prose uses a different display name (e.g. "next" vs "Next.js").
const PACKAGE_ALIASES: Record<string, string> = {
  next: "Next.js",
  react: "React",
  "react-dom": "React",
  vue: "Vue",
  "@vue/runtime-core": "Vue",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  nuxt: "Nuxt",
  typescript: "TypeScript",
  tailwindcss: "Tailwind",
  express: "Express",
  fastify: "Fastify",
  "next-auth": "NextAuth",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  mongoose: "Mongoose",
  "@supabase/supabase-js": "Supabase",
  firebase: "Firebase",
  axios: "Axios",
  vite: "Vite",
  webpack: "webpack",
  eslint: "ESLint",
  jest: "Jest",
  vitest: "Vitest",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  redux: "Redux",
  "@reduxjs/toolkit": "Redux",
  zustand: "Zustand",
  graphql: "GraphQL",
  "apollo-server": "Apollo",
  "@apollo/client": "Apollo",
  langchain: "LangChain",
  "@google/genai": "Gemini",
  openai: "OpenAI",
  torch: "PyTorch",
  tensorflow: "TensorFlow",
  numpy: "NumPy",
  pandas: "pandas",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
};

// Scope-stripping a name like "@eslint/js" or "@babel/core" can produce a
// generic remnant ("js", "core") that substring-matches almost any article
// text (e.g. "js" inside "Next.js") and produces false-positive warnings.
// Found via live testing against vercel/next.js's own package.json before
// shipping - excluded explicitly rather than trusting scope-stripping alone.
const GENERIC_REMNANTS = new Set([
  "js", "ts", "cli", "core", "types", "utils", "util", "config", "plugin",
  "plugins", "loader", "common", "shared", "test", "tests", "build", "dev", "app",
]);

function normalizePackageName(pkgName: string): string | null {
  if (PACKAGE_ALIASES[pkgName]) return PACKAGE_ALIASES[pkgName];
  // strip an npm scope (@scope/name -> name) as a readable fallback keyword
  const base = pkgName.startsWith("@") ? pkgName.split("/")[1] ?? pkgName : pkgName;
  if (base.length < 3 || GENERIC_REMNANTS.has(base.toLowerCase())) return null;
  return base;
}

export function extractDependencyKeywords(packageJson: unknown): { keyword: string; pkgName: string }[] {
  if (typeof packageJson !== "object" || packageJson === null) return [];
  const obj = packageJson as Record<string, unknown>;
  const deps = { ...(obj.dependencies as Record<string, string> | undefined), ...(obj.devDependencies as Record<string, string> | undefined) };
  return Object.keys(deps ?? {})
    .map((pkgName) => ({ keyword: normalizePackageName(pkgName), pkgName }))
    .filter((d): d is { keyword: string; pkgName: string } => d.keyword !== null);
}

const MATCH_LOOKBACK = 300; // recent generations to scan - breaking-change articles are rare, so this comfortably covers months of crawl history without a schema change to index isBreakingChange directly

// Deterministic keyword matching against already-generated breaking-change
// flags - no Gemini call here, so this is free to run on every repo check.
export async function findBreakingChangeMatches(dependencyKeywords: { keyword: string; pkgName: string }[]): Promise<RepoCheckMatch[]> {
  if (dependencyKeywords.length === 0) return [];

  const recent = await prisma.aIGeneration.findMany({
    orderBy: { createdAt: "desc" },
    take: MATCH_LOOKBACK,
    select: { prosAndCons: true, summary: true, glossary: true, article: { select: { title: true, url: true } } },
  });

  const matches: RepoCheckMatch[] = [];
  for (const gen of recent) {
    let insight;
    try {
      insight = parseGeneration(gen);
    } catch {
      continue;
    }
    if (!insight.isBreakingChange || !insight.breakingChangeSummary) continue;

    const haystack = `${gen.article.title ?? ""} ${insight.breakingChangeSummary}`.toLowerCase();
    for (const { keyword } of dependencyKeywords) {
      if (haystack.includes(keyword.toLowerCase())) {
        matches.push({
          keyword,
          articleTitle: gen.article.title ?? gen.article.url,
          articleUrl: gen.article.url,
          breakingChangeSummary: insight.breakingChangeSummary,
        });
        break; // one match per article is enough - avoid duplicate entries for multi-keyword hits
      }
    }
  }
  return matches;
}
