import { SourceType } from "@/generated/prisma";
import type { CrawledArticle } from "./types";

interface AlgoliaHit {
  title: string | null;
  url: string | null;
  points: number | null;
  created_at: string;
  objectID: string;
}

const LOOKBACK_DAYS = 7;
const MIN_POINTS = 15; // HN's volume is very high; a quality floor keeps a week's worth from being pure noise

// Algolia's HN Search API - public, no auth, easier to consume than the raw Firebase API.
// Bounded to the last week via numericFilters so a fast-moving front page
// doesn't push older-but-still-recent stories out of a plain "latest N" call.
export async function crawlHackerNews(): Promise<CrawledArticle[]> {
  const sinceUnix = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 24 * 60 * 60;
  const params = new URLSearchParams({
    tags: "story",
    hitsPerPage: "100",
    numericFilters: `created_at_i>${sinceUnix},points>=${MIN_POINTS}`,
  });

  const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?${params}`);
  if (!res.ok) throw new Error(`Hacker News API error: ${res.status}`);

  const data: { hits: AlgoliaHit[] } = await res.json();
  return data.hits
    .filter((hit) => hit.url && hit.title) // skip Ask HN / text-only posts with no external article
    .map((hit) => ({
      url: hit.url as string,
      title: hit.title as string,
      sourceType: SourceType.HACKER_NEWS,
      publishedAt: new Date(hit.created_at),
      engagement: hit.points ?? 0,
    }));
}
