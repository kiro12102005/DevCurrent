// Load test for the two read/write paths most relevant to a real production
// incident this app had: a Prisma connection-pool-exhaustion error under
// concurrent writes against Supabase's pooled Postgres (fixed via
// mapWithConcurrency in src/lib/crawlers/refresh.ts - see docs/DESIGN_DECISIONS.md).
//
// SAFETY: this only ever targets a local server (localhost/127.0.0.1) by
// design - never point it at production. GET /api/summarize is a real
// Gemini API call on a cache miss, and this app runs on Gemini's free tier
// (see gemini.ts's MODEL_CANDIDATES comment); a load test hammering it
// against a fresh/uncached URL would burn through the daily quota in
// seconds. This script only ever re-requests an ALREADY-cached URL, so
// every request after the first hits the DB cache path, not Gemini.
//
// Usage:
//   pnpm build && pnpm start   # in one terminal
//   node load-tests/feed-load-test.js   # in another
import autocannon from "autocannon";

const BASE_URL = process.env.LOAD_TEST_URL || "http://localhost:3000";

function assertLocalOnly(url) {
  const { hostname } = new URL(url);
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(
      `Refusing to load-test a non-local host (${hostname}). This script is hardcoded to local-only on purpose - ` +
        "load-testing the real production deployment would hit real Gemini API quota/cost. If you really mean to " +
        "target something else, edit this guard directly, don't just override LOAD_TEST_URL."
    );
  }
}

async function findCachedArticleUrl() {
  const res = await fetch(`${BASE_URL}/api/feed?period=week`);
  if (!res.ok) throw new Error(`GET /api/feed failed: ${res.status}`);
  const data = await res.json();
  const withInsight = [...(data.featured ?? []), ...(data.regular ?? [])].find((a) => a.hasInsight);
  if (!withInsight) {
    throw new Error(
      "No already-summarized article found in the local feed to safely load-test /api/summarize against. " +
        "Run the app and summarize at least one URL first, or skip the summarize test."
    );
  }
  return withInsight.url;
}

async function run(name, opts) {
  console.log(`\n=== ${name} ===`);
  const result = await autocannon(opts);
  console.log(autocannon.printResult(result));
  return result;
}

async function main() {
  assertLocalOnly(BASE_URL);
  console.log(`Load testing ${BASE_URL} (local only)`);

  // Read path: GET /api/feed - no Gemini calls, pure DB read under concurrency.
  await run("GET /api/feed (read-heavy, 20 concurrent, 15s)", {
    url: `${BASE_URL}/api/feed?period=week`,
    connections: 20,
    duration: 15,
  });

  // Write/cache path: POST /api/summarize against an ALREADY-cached URL -
  // exercises the DB write/cache-check path the original incident hit,
  // without any new Gemini calls (cache hit returns before ever reaching
  // generateInsight()).
  const cachedUrl = await findCachedArticleUrl();
  console.log(`\nUsing cached article for summarize load test: ${cachedUrl}`);
  await run("POST /api/summarize (cached URL, 20 concurrent, 15s)", {
    url: `${BASE_URL}/api/summarize`,
    connections: 20,
    duration: 15,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: cachedUrl }),
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
