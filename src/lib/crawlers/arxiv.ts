import * as cheerio from "cheerio";
import { SourceType } from "@/generated/prisma";
import type { CrawledArticle } from "./types";

const LOOKBACK_DAYS = 7;
const MAX_RESULTS = 40;

function arxivTimestamp(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, "0");
  // YYYYMMDDHHMM, built from date parts directly - slicing toISOString() left
  // a stray "T" in the middle (e.g. "20260720T073"), which ArXiv rejected with a 500.
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function buildQuery(): string {
  // cs.AI/CL/LG/SE cover the categories most relevant to job-hunting engineers.
  const categories = "(cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG+OR+cat:cs.SE)";
  const dateRange = `submittedDate:[${arxivTimestamp(LOOKBACK_DAYS)}+TO+${arxivTimestamp(0)}]`;
  const params = new URLSearchParams({
    sortBy: "submittedDate",
    sortOrder: "descending",
    max_results: String(MAX_RESULTS),
  });
  return `search_query=${categories}+AND+${dateRange}&${params}`;
}

// ArXiv has no likes/points signal, so engagement is always 0 - papers show up
// in the raw feed by recency but won't win the engagement-based "featured" picks.
// Explicitly date-bounded to the last week (rather than a plain "latest N")
// since these categories combined can post 100+ papers/day.
export async function crawlArxiv(): Promise<CrawledArticle[]> {
  const res = await fetch(`http://export.arxiv.org/api/query?${buildQuery()}`);
  if (!res.ok) throw new Error(`ArXiv API error: ${res.status}`);

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const articles: CrawledArticle[] = [];
  $("entry").each((_, el) => {
    const entry = $(el);
    const title = entry.find("title").first().text().replace(/\s+/g, " ").trim();
    const url = entry.find("id").first().text().trim();
    const published = entry.find("published").first().text().trim();
    if (!title || !url) return;

    articles.push({
      url,
      title,
      sourceType: SourceType.ARXIV,
      publishedAt: published ? new Date(published) : null,
      engagement: 0,
    });
  });

  return articles;
}
