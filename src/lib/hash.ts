import { createHash } from "crypto";

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  // strip common tracking params so the same article isn't cached twice
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"].forEach((p) =>
    url.searchParams.delete(p)
  );
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
