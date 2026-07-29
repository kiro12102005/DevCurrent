import type { MetadataRoute } from "next";

const BASE_URL = "https://dev-current.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API routes aren't meaningful crawl targets and some are POST-only /
      // session-gated anyway; excluding them keeps crawl budget on real pages.
      disallow: "/api/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
