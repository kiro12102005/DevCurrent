import { NextResponse } from "next/server";
import type { GithubStats } from "@/types/github";
import { REPO_PATTERN, githubFetch } from "@/lib/github";

export async function GET(req: Request) {
  const repo = new URL(req.url).searchParams.get("repo") ?? "";
  if (!REPO_PATTERN.test(repo)) {
    return NextResponse.json({ error: "不正なリポジトリ指定です" }, { status: 400 });
  }

  try {
    const repoRes = await githubFetch(`/repos/${repo}`);
    if (!repoRes.ok) {
      // 404 (repo renamed/deleted/private) or rate-limited - not an error the
      // user needs to see, just "no stats available" so the UI can hide the section.
      return NextResponse.json({ stats: null });
    }
    const repoData = await repoRes.json();

    // last commit on the default branch
    let lastCommitAt: string | null = null;
    const commitsRes = await githubFetch(`/repos/${repo}/commits?per_page=1`);
    if (commitsRes.ok) {
      const commits = await commitsRes.json();
      lastCommitAt = commits[0]?.commit?.author?.date ?? null;
    }

    let latestReleaseTag: string | null = null;
    let latestReleaseAt: string | null = null;
    const releaseRes = await githubFetch(`/repos/${repo}/releases/latest`);
    if (releaseRes.ok) {
      const release = await releaseRes.json();
      latestReleaseTag = release.tag_name ?? null;
      latestReleaseAt = release.published_at ?? null;
    }

    const stats: GithubStats = {
      fullName: repoData.full_name,
      stars: repoData.stargazers_count,
      lastCommitAt,
      latestReleaseTag,
      latestReleaseAt,
      url: repoData.html_url,
    };
    return NextResponse.json({ stats });
  } catch {
    // Network hiccup talking to GitHub shouldn't break the article view -
    // just show it without the stats section.
    return NextResponse.json({ stats: null });
  }
}
