import { SourceType } from "@/generated/prisma";
import type { CrawledArticle } from "./types";

interface ZennArticle {
  title: string;
  path: string;
  liked_count: number;
  published_at: string;
}

const LOOKBACK_DAYS = 7;
const PAGE_SIZE = 40;
const MAX_PAGES = 5; // bounds worst-case request count; loop exits early once past the lookback window

// Zenn's public (undocumented but widely used) JSON endpoint that backs zenn.dev/api itself.
// Paginates (results are latest-first) until articles fall outside the lookback
// window, so a quiet week doesn't need many requests and a busy week isn't
// silently truncated to whatever fit on page 1.
export async function crawlZenn(): Promise<CrawledArticle[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const results: CrawledArticle[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`https://zenn.dev/api/articles?order=latest&count=${PAGE_SIZE}&page=${page}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Zenn API error: ${res.status}`);

    const data: { articles: ZennArticle[] } = await res.json();
    if (data.articles.length === 0) break;

    let reachedCutoff = false;
    for (const article of data.articles) {
      const publishedAt = new Date(article.published_at);
      if (publishedAt < cutoff) {
        reachedCutoff = true;
        break;
      }
      results.push({
        url: `https://zenn.dev${article.path}`,
        title: article.title,
        sourceType: SourceType.ZENN,
        publishedAt,
        engagement: article.liked_count,
        country: "日本", // Zenn is a Japanese platform
      });
    }
    if (reachedCutoff) break;
  }

  return results;
}
