import { SourceType } from "@/generated/prisma";
import type { CrawledArticle } from "./types";

interface GithubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
}

// Repos whose official releases are directly relevant to this app's
// audience - the same JS/web stack DevCurrent itself is built on. Extend
// this list to track more ecosystems: each entry only needs an owner/repo,
// GitHub's Releases API does the rest (no per-project scraping/parsing to
// maintain, unlike each project's own blog which differ wildly in markup
// and half don't even publish RSS).
const WATCHED_REPOS = [
  { owner: "vercel", repo: "next.js", label: "Next.js" },
  { owner: "facebook", repo: "react", label: "React" },
  { owner: "nodejs", repo: "node", label: "Node.js" },
  { owner: "microsoft", repo: "TypeScript", label: "TypeScript" },
  { owner: "vitejs", repo: "vite", label: "Vite" },
  { owner: "tailwindlabs", repo: "tailwindcss", label: "Tailwind CSS" },
];

// Refresh cycles run every few hours, but stable releases are sparse
// (sometimes none for weeks) - a wider lookback than other crawlers gives a
// safety margin against a missed cycle without any downside, since
// already-seen releases are filtered out by refresh.ts's URL-hash dedup
// regardless.
const LOOKBACK_DAYS = 14;

// The Releases API has no reactions/engagement signal - a flat score above 0
// is enough to rank among same-cycle releases and clear the "featured" bar
// in refresh.ts (an official stable release is inherently noteworthy
// regardless of how many people have reacted to it yet).
const RELEASE_ENGAGEMENT_SCORE = 50;

// Some projects (Next.js in particular) publish canary/RC builds multiple
// times a day - only `prerelease: false, draft: false` entries are official
// stable releases worth surfacing, everything else would drown the feed in
// pre-release noise. This is why the REST API is used here instead of the
// simpler Atom feed (github.com/{owner}/{repo}/releases.atom), which
// includes prereleases with no way to filter them out.
async function crawlRepoReleases(owner: string, repo: string, label: string, cutoff: Date): Promise<CrawledArticle[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`${res.status}`);

  const releases: GithubRelease[] = await res.json();
  return releases
    .filter((r) => !r.draft && !r.prerelease && r.published_at && new Date(r.published_at) >= cutoff)
    .map((r) => ({
      url: r.html_url,
      title: `${label} ${r.name?.trim() || r.tag_name}`,
      sourceType: SourceType.RELEASE_NOTES,
      publishedAt: new Date(r.published_at as string),
      engagement: RELEASE_ENGAGEMENT_SCORE,
    }));
}

// A single watched repo's fetch failing (rename, rate limit, temporary
// outage) shouldn't fail the whole crawler - errors are logged but not
// thrown, trading per-repo error visibility in refresh.ts for resilience
// across a watchlist that's expected to grow.
export async function crawlReleaseNotes(): Promise<CrawledArticle[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const results = await Promise.allSettled(
    WATCHED_REPOS.map((r) => crawlRepoReleases(r.owner, r.repo, r.label, cutoff))
  );

  const articles: CrawledArticle[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      const { owner, repo } = WATCHED_REPOS[i];
      console.error(`[releaseNotes] ${owner}/${repo} failed:`, result.reason);
    }
  });
  return articles;
}
