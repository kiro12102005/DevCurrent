import { prisma } from "@/lib/prisma";
import { normalizeUrl, sha256 } from "@/lib/hash";
import { generateInsightForArticle } from "@/lib/summarize";
import { sendPushToAllSubscribers } from "@/lib/push";
import { translateTitles } from "@/lib/gemini";
import { looksJapanese } from "@/lib/lang";
import { Prisma, SourceType } from "@/generated/prisma";
import { crawlQiita } from "./qiita";
import { crawlZenn } from "./zenn";
import { crawlHackerNews } from "./hackernews";
import { crawlArxiv } from "./arxiv";
import type { CrawledArticle } from "./types";

const FEATURED_PER_SOURCE = 2; // diversity across sources beats a single global top-N
const FEATURED_MAX_TOTAL = 6; // caps Gemini calls + push notifications per refresh cycle
const TITLE_BACKFILL_BATCH = 20; // caps the one-time-per-cycle catch-up translation call
const RETENTION_DAYS = 180; // unsummarized, non-featured backlog older than this gets pruned

// Storage policy: featured picks and anything that got a Gemini summary
// (isFeatured or hasInsight - either one is "was judged valuable, or someone
// already spent an API call on it") are kept indefinitely. Plain crawled
// metadata nobody ever engaged with is pruned after RETENTION_DAYS so the DB
// doesn't grow forever from a 3-hourly, multi-source crawl. User-submitted
// URLs are never touched here.
async function cleanupOldArticles(errors: string[]): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  try {
    const { count } = await prisma.article.deleteMany({
      where: {
        sourceType: { not: SourceType.USER_SUBMITTED },
        isFeatured: false,
        generation: null,
        OR: [{ sourcePublishedAt: { lt: cutoff } }, { sourcePublishedAt: null, fetchedAt: { lt: cutoff } }],
      },
    });
    return count;
  } catch (err) {
    errors.push(`cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

// Fixes titles/country for articles crawled BEFORE a GEMINI_API_KEY was
// configured (or before these features existed) - runs every cycle so the
// backlog gets cleared a bit at a time without a large one-off translation bill.
async function backfillJapaneseTitles(errors: string[]): Promise<void> {
  // Qiita/Zenn origin is always Japan and needs no API call - fix those rows directly.
  await prisma.article.updateMany({
    where: { sourceType: { in: [SourceType.QIITA, SourceType.ZENN] }, country: null },
    data: { country: "日本" },
  });

  if (!process.env.GEMINI_API_KEY) return;

  const candidates = await prisma.article.findMany({
    where: { sourceType: { not: SourceType.USER_SUBMITTED } },
    orderBy: { fetchedAt: "desc" },
    take: 200,
    select: { id: true, title: true, country: true },
  });
  const needsWork = candidates
    .filter(
      (a): a is { id: string; title: string; country: string | null } =>
        Boolean(a.title) && (!looksJapanese(a.title as string) || !a.country)
    )
    .slice(0, TITLE_BACKFILL_BATCH);

  if (needsWork.length === 0) return;

  try {
    const tagged = await translateTitles(needsWork.map((a) => a.title));
    await Promise.all(
      needsWork.map((a, i) =>
        prisma.article.update({
          where: { id: a.id },
          data: {
            title: tagged[i]?.japaneseTitle ?? a.title,
            country: a.country ?? tagged[i]?.country ?? null,
          },
        })
      )
    );
  } catch (err) {
    errors.push(`title backfill failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const CRAWLERS: { source: string; run: () => Promise<CrawledArticle[]> }[] = [
  { source: "Qiita", run: crawlQiita },
  { source: "Zenn", run: crawlZenn },
  { source: "Hacker News", run: crawlHackerNews },
  { source: "ArXiv", run: crawlArxiv },
];

export interface RefreshResult {
  crawled: number;
  newArticles: number;
  featured: { title: string; url: string }[];
  deletedOld: number;
  errors: string[];
}

export async function refreshFeed(): Promise<RefreshResult> {
  const errors: string[] = [];

  const results = await Promise.allSettled(CRAWLERS.map((c) => c.run()));
  const crawled: CrawledArticle[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      crawled.push(...result.value);
    } else {
      errors.push(`${CRAWLERS[i].source}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  });

  // dedupe within this batch by normalized URL, keep the highest-engagement copy
  const byHash = new Map<string, CrawledArticle & { normalizedUrl: string; urlHash: string }>();
  for (const item of crawled) {
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(item.url);
    } catch {
      continue; // malformed URL from a source feed - skip rather than crash the batch
    }
    const urlHash = sha256(normalizedUrl);
    const existingBatch = byHash.get(urlHash);
    if (!existingBatch || existingBatch.engagement < item.engagement) {
      byHash.set(urlHash, { ...item, normalizedUrl, urlHash });
    }
  }

  // skip anything already known (whether from a previous crawl or a user-submitted URL)
  const existingRows = await prisma.article.findMany({
    where: { urlHash: { in: [...byHash.keys()] } },
    select: { urlHash: true },
  });
  const existingHashes = new Set(existingRows.map((r) => r.urlHash));
  const freshItems = [...byHash.values()].filter((item) => !existingHashes.has(item.urlHash));

  // run every cycle regardless of whether there are new articles, so the
  // title backlog and storage pruning both make steady progress over time
  await backfillJapaneseTitles(errors);
  const deletedOld = await cleanupOldArticles(errors);

  if (freshItems.length === 0) {
    return { crawled: crawled.length, newArticles: 0, featured: [], deletedOld, errors };
  }

  // batch-translate + country-tag non-Japanese titles (Hacker News / ArXiv are
  // almost always English) in ONE Gemini call for the whole batch, so every
  // feed item gets a readable Japanese title and a country guess without the
  // cost of summarizing each one individually.
  const nonJapaneseIndices = freshItems
    .map((item, i) => (looksJapanese(item.title) ? -1 : i))
    .filter((i) => i >= 0);
  if (nonJapaneseIndices.length > 0 && process.env.GEMINI_API_KEY) {
    try {
      const tagged = await translateTitles(nonJapaneseIndices.map((i) => freshItems[i].title));
      nonJapaneseIndices.forEach((i, j) => {
        freshItems[i].title = tagged[j]?.japaneseTitle ?? freshItems[i].title;
        freshItems[i].country = tagged[j]?.country ?? null;
      });
    } catch (err) {
      errors.push(`title translation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // pick featured candidates BEFORE inserting, so scoring only ever sees this batch
  const featuredHashes = new Set<string>();
  for (const source of [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS]) {
    freshItems
      .filter((item) => item.sourceType === source)
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, FEATURED_PER_SOURCE)
      .forEach((item) => featuredHashes.add(item.urlHash));
  }
  const cappedFeaturedHashes = new Set([...featuredHashes].slice(0, FEATURED_MAX_TOTAL));

  // create() (not upsert) is intentional here - freshItems was already
  // filtered against existingHashes, so a P2002 at this point means a
  // concurrent refreshFeed() call (e.g. the instrumentation timer firing
  // while a manual "今すぐ更新" is also in flight) inserted the same URL
  // first. That's not an error - just skip it, the other call already has it.
  const createdArticles = (
    await Promise.all(
      freshItems.map(async (item) => {
        try {
          return await prisma.article.create({
            data: {
              url: item.normalizedUrl,
              urlHash: item.urlHash,
              title: item.title,
              sourceType: item.sourceType,
              sourcePublishedAt: item.publishedAt,
              country: item.country ?? null,
              engagementScore: item.engagement,
              isFeatured: cappedFeaturedHashes.has(item.urlHash),
            },
          });
        } catch (err) {
          const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (!isDuplicate) throw err;
          return null;
        }
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null);

  // auto-generate full insight for featured picks only (bounded volume, server's own key -
  // this is a shared curation job, not a per-user request, so BYOK doesn't apply here)
  const featuredArticles = createdArticles.filter((a) => cappedFeaturedHashes.has(a.urlHash));
  const newlyFeatured: { title: string; url: string }[] = [];

  for (const article of featuredArticles) {
    try {
      await generateInsightForArticle(article, undefined);
      newlyFeatured.push({ title: article.title ?? article.url, url: article.url });
    } catch (err) {
      errors.push(`insight generation failed for ${article.url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (newlyFeatured.length === 1) {
    await sendPushToAllSubscribers({
      title: "注目の技術記事を見つけました",
      body: newlyFeatured[0].title,
      url: newlyFeatured[0].url,
    });
  } else if (newlyFeatured.length > 1) {
    await sendPushToAllSubscribers({
      title: `注目の技術記事を${newlyFeatured.length}件見つけました`,
      body: newlyFeatured.map((a) => a.title).join(" / "),
      url: "/",
    });
  }

  return { crawled: crawled.length, newArticles: freshItems.length, featured: newlyFeatured, deletedOld, errors };
}
