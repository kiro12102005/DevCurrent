import { NextResponse } from "next/server";
import { z } from "zod";
import { githubFetch, REPO_PATTERN } from "@/lib/github";
import { extractDependencyKeywords, findBreakingChangeMatches } from "@/lib/repoCheck";
import type { RepoCheckResponse } from "@/types/repoCheck";

const requestSchema = z.object({
  repo: z.string().regex(REPO_PATTERN, "owner/repo 形式で入力してください"),
});

// Deterministic keyword match against already-generated breaking-change
// flags - no Gemini call, so unlike the BYOK generators above this is free
// to run on every request (public repo read only, GITHUB_TOKEN optional).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }
  const { repo } = parsed.data;

  const pkgRes = await githubFetch(`/repos/${repo}/contents/package.json`);
  if (pkgRes.status === 404) {
    return NextResponse.json(
      { error: "package.jsonが見つかりませんでした（現在npmプロジェクトのみ対応・リポジトリが公開かもご確認ください）" },
      { status: 404 }
    );
  }
  if (!pkgRes.ok) {
    return NextResponse.json({ error: "GitHubからの取得に失敗しました（レート制限の可能性があります）" }, { status: 502 });
  }

  try {
    const pkgData: { content: string } = await pkgRes.json();
    const packageJson = JSON.parse(Buffer.from(pkgData.content, "base64").toString("utf-8"));
    const dependencyKeywords = extractDependencyKeywords(packageJson);
    const matches = await findBreakingChangeMatches(dependencyKeywords);

    const response: RepoCheckResponse = { repo, dependencyCount: dependencyKeywords.length, matches };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[repo-check] failed:", err);
    return NextResponse.json({ error: "package.jsonの解析に失敗しました" }, { status: 500 });
  }
}
