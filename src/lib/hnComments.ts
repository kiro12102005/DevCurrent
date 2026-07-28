interface AlgoliaSearchHit {
  objectID: string;
  url: string | null;
}

interface HnItem {
  text?: string | null;
  children?: HnItem[];
}

const MIN_COMMENTS = 5; // below this, a pro/con matrix would be thinly-sourced noise, not signal
const MAX_COMMENTS = 25;
const MAX_TOTAL_CHARS = 6000; // bounds the Gemini prompt size regardless of how chatty a thread got

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/\s+/g, " ")
    .trim();
}

// Depth-first collection of comment text, in the order HN displays them
// (top-level comments first) - good enough for "grab the most visible
// opinions" without needing to model score/ranking ourselves.
function collectCommentText(children: HnItem[] | undefined, out: string[]): void {
  if (!children) return;
  for (const child of children) {
    if (out.length >= MAX_COMMENTS) return;
    if (child.text) {
      const text = stripHtml(child.text);
      if (text) out.push(text);
    }
    collectCommentText(child.children, out);
  }
}

// Finds the Hacker News discussion for a given external article URL (via
// Algolia's public search, no auth) and returns its top comments as plain
// text, or null if no matching HN thread / not enough comments to be
// meaningful. Used only for the crawl-time featured-picks debate matrix
// (see refresh.ts) - never on the BYOK manual-summarize path.
export async function fetchHnComments(articleUrl: string): Promise<string[] | null> {
  const searchParams = new URLSearchParams({
    query: articleUrl,
    restrictSearchableAttributes: "url",
    tags: "story",
    hitsPerPage: "1",
  });
  const searchRes = await fetch(`https://hn.algolia.com/api/v1/search?${searchParams}`);
  if (!searchRes.ok) return null;
  const searchData: { hits: AlgoliaSearchHit[] } = await searchRes.json();
  const hit = searchData.hits[0];
  if (!hit) return null;

  const itemRes = await fetch(`https://hn.algolia.com/api/v1/items/${hit.objectID}`);
  if (!itemRes.ok) return null;
  const item: HnItem = await itemRes.json();

  const comments: string[] = [];
  collectCommentText(item.children, comments);
  if (comments.length < MIN_COMMENTS) return null;

  const bounded: string[] = [];
  let totalChars = 0;
  for (const c of comments) {
    if (totalChars + c.length > MAX_TOTAL_CHARS) break;
    bounded.push(c);
    totalChars += c.length;
  }
  return bounded.length >= MIN_COMMENTS ? bounded : null;
}
