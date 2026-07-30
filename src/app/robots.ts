import type { MetadataRoute } from "next";

const BASE_URL = "https://dev-current.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API routes aren't meaningful crawl targets and some are POST-only /
      // session-gated anyway; excluding them keeps crawl budget on real pages.
      // /admin/ is operator-only (see src/app/admin/usage/page.tsx) - also
      // has its own noindex metadata, this is belt-and-suspenders.
      disallow: ["/api/", "/admin/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
