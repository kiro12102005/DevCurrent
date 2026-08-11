import { SourceType } from "@/generated/prisma";
import type { CrawledArticle } from "./types";

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  created_at: string;
}

const LOOKBACK_DAYS = 7;
const MAX_RESULTS = 25;
const MIN_STARS = 20;
const MAX_DESCRIPTION_CHARS = 120;

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// GitHub has no official "Trending" API - github.com/trending is HTML-only
// and not a stable contract to scrape. The public Search API is used as a
// proxy instead: repos CREATED in the last week ranked by stars, which
// captures the same "new and already gaining traction" spirit without
// depending on page markup that can change without notice. Unauthenticated
// Search API is capped at 10 req/min, comfortably enough for one call per
// refresh cycle.
export async function crawlGithubTrending(): Promise<CrawledArticle[]> {
  const params = new URLSearchParams({
    q: `created:>=${isoDate(LOOKBACK_DAYS)} stars:>=${MIN_STARS}`,
    sort: "stars",
    order: "desc",
    per_page: String(MAX_RESULTS),
  });

  const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub Search API error: ${res.status}`);

  const data: { items: GithubRepo[] } = await res.json();
  return data.items.map((repo) => {
    const description = repo.description?.trim();
    const title = description ? `${repo.full_name}: ${description.slice(0, MAX_DESCRIPTION_CHARS)}` : repo.full_name;
    return {
      url: repo.html_url,
      title,
      sourceType: SourceType.GITHUB_TRENDING,
      publishedAt: new Date(repo.created_at),
      engagement: repo.stargazers_count,
    };
  });
}
