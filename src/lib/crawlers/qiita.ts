import { SourceType } from "@/generated/prisma";
import type { CrawledArticle } from "./types";

interface QiitaItem {
  title: string;
  url: string;
  likes_count: number;
  stocks_count: number;
  created_at: string;
}

const LOOKBACK_DAYS = 7;

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Public read-only endpoint, no auth token required (rate-limited to 60 req/hour
// without one, which is plenty for a refresh every few hours). Explicitly bound
// to the last week so a single "latest N" page can't silently miss older-but-
// still-recent articles once daily volume exceeds the page size.
export async function crawlQiita(): Promise<CrawledArticle[]> {
  const query = new URLSearchParams({
    page: "1",
    per_page: "100",
    query: `stocks:>=3 created:>=${isoDate(LOOKBACK_DAYS)}`,
  });

  const res = await fetch(`https://qiita.com/api/v2/items?${query}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Qiita API error: ${res.status}`);

  const items: QiitaItem[] = await res.json();
  return items.map((item) => ({
    url: item.url,
    title: item.title,
    sourceType: SourceType.QIITA,
    publishedAt: new Date(item.created_at),
    engagement: item.likes_count + item.stocks_count,
    country: "日本", // Qiita is a Japanese platform
  }));
}
