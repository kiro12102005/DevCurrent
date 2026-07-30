import * as Sentry from "@sentry/nextjs";

// Next.js calls register() once when the server process starts, for both the
// nodejs AND edge runtime targets - load the matching Sentry init for each.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    startFeedCron();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Automatically captures Server Component / Server Action / Route Handler
// errors that reach Next.js without being manually caught.
export const onRequestError = Sentry.captureRequestError;

// Runs the feed crawler on a recurring timer for any long-running deployment
// (self-hosted, Docker, this devcontainer). Serverless deployments (Vercel)
// can't keep a setInterval alive between requests - for those, hit
// POST /api/feed/refresh from Vercel Cron or a GitHub Actions schedule instead.
//
// This calls the /api/feed/refresh route over HTTP rather than importing
// refreshFeed() directly, so the web-push import it drags in (Node-only,
// needs "http"/"https") stays confined to the route handler instead of this
// file, which Next.js also compiles for the edge runtime target.
function startFeedCron() {
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
