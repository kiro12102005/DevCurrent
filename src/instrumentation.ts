// Next.js calls register() once when the server process starts. We use it to
// run the feed crawler on a recurring timer for any long-running deployment
// (self-hosted, Docker, this devcontainer). Serverless deployments (Vercel)
// can't keep a setInterval alive between requests - for those, hit
// POST /api/feed/refresh from Vercel Cron or a GitHub Actions schedule instead.
//
// This calls the /api/feed/refresh route over HTTP rather than importing
// refreshFeed() directly. Next.js compiles instrumentation.ts for both the
// nodejs AND edge runtime targets, and a direct import drags in web-push
// (Node-only, needs "http"/"https") into the edge bundle, which fails to
// compile. Going through the route keeps that import confined to the route
// handler, which Next always bundles nodejs-only.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_AUTO_FEED_CRON === "false") return;

  const globalForCron = globalThis as unknown as { __feedCronStarted?: boolean };
  if (globalForCron.__feedCronStarted) return; // dev hot-reload re-invokes register()
  globalForCron.__feedCronStarted = true;

  const intervalHours = Number(process.env.FEED_REFRESH_INTERVAL_HOURS ?? "3");
  const intervalMs = Math.max(intervalHours, 0.1) * 60 * 60 * 1000;
  const port = process.env.PORT ?? "3000";
  const baseUrl = process.env.FEED_REFRESH_BASE_URL ?? `http://127.0.0.1:${port}`;
  const cronSecret = process.env.CRON_SECRET;

  const runRefresh = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/feed/refresh`, {
        method: "POST",
        headers: cronSecret ? { "x-cron-secret": cronSecret } : {},
      });
      const result = await res.json();
      console.log(
        `[feed-cron] crawled=${result.crawled} new=${result.newArticles} featured=${result.featured?.length ?? 0}`,
        result.errors?.length ? { errors: result.errors } : ""
      );
    } catch (err) {
      console.error("[feed-cron] refresh failed:", err);
    }
  };

  setTimeout(runRefresh, 15_000); // first run shortly after boot, once the server is accepting requests
  setInterval(runRefresh, intervalMs);
}
