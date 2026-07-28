// Public GitHub REST API - no auth needed for public repo reads, but capped
// at 60 req/hour per IP unauthenticated. Setting GITHUB_TOKEN (a plain
// repo-read PAT, no special scopes needed) raises that to 5000/hour;
// optional, same "degrade gracefully without it" pattern as GEMINI_API_KEY
// elsewhere. Shared by /api/github-stats and /api/repo-check.
export const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export async function githubFetch(path: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetch(`https://api.github.com${path}`, { headers, next: { revalidate: 3600 } });
}
