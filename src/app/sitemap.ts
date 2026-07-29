import type { MetadataRoute } from "next";

const BASE_URL = "https://dev-current.vercel.app";

// Only the static, always-public routes. /u/[slug] pages are user opt-in
// share pages - not disallowed for crawlers, but not proactively listed here
// either, since "shared a link" and "wants to be search-indexed" aren't the
// same consent.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
