import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // src/app/offline/page.tsx is shown for uncached navigations while offline.
  // Named "/offline", not the plugin's default "/_offline" - Next.js App
  // Router treats an underscore-prefixed folder as private and excludes it
  // from routing entirely, so "_offline" is never reachable as a URL.
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // keep the plugin's default caching (fonts/images/JS/CSS/static data) and
    // layer on NetworkFirst rules for the two read-heavy list endpoints, so a
    // flaky connection or brief offline moment still shows the last-fetched
    // feed/tools list instead of an error.
    runtimeCaching: [
      {
        urlPattern: /\/api\/feed(\?.*)?$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-feed",
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
        },
      },
      {
        urlPattern: /\/api\/tools(\?.*)?$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-tools",
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 1 week
        },
      },
    ],
  },
  extendDefaultRuntimeCaching: true,
});

export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map upload auth token - unset for now (see DEPLOY.md), so uploads
  // are silently skipped and production stack traces show minified code
  // until it's configured.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Proxies Sentry's own requests through our domain so ad-blockers don't
  // silently drop client-side events/replays.
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,

  // Disabled: the rollup-based AST rewrite this performs (auto-wrapping
  // every page/API-route/route-handler/server-component for finer-grained
  // per-route tracing spans) fails to resolve its own
  // @rollup/rollup-linux-x64-gnu optional dependency through Next.js's
  // build-time require-hook in this environment, which hard-fails the whole
  // build. Error capture is unaffected - that comes from onRequestError in
  // instrumentation.ts, not this wrapping.
  webpack: {
    autoInstrumentServerFunctions: false,
    autoInstrumentAppDirectory: false,
    autoInstrumentMiddleware: false,
  },
});
