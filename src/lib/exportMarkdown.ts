import type { SummarizeResponse } from "@/types/insight";
import type { SavedItem } from "@/types/saved";
import type { LearningLogResponse } from "@/types/learningLog";
import { SOURCE_LABEL } from "@/lib/sourceLabels";

export function articleInsightToMarkdown(data: SummarizeResponse): string {
  const { article, insight } = data;
  const lines: string[] = [];
  lines.push(`# ${article.title ?? article.url}`);
  lines.push("");
  lines.push(`- 出典: ${SOURCE_LABEL[article.sourceType]}${article.publishedAt ? ` (${article.publishedAt.slice(0, 10)})` : ""}`);
  lines.push(`- 元記事: ${article.url}`);
  if (article.country) lines.push(`- 発信国: ${article.country}`);
  lines.push("");
  lines.push("## 要約");
  lines.push(insight.summary);
  lines.push("");
  lines.push("## メリット");
  for (const p of insight.pros) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## 懸念点");
  for (const c of insight.cons) lines.push(`- ${c}`);
  lines.push("");
  lines.push("## 今後の展望");
  lines.push(insight.outlook);
  lines.push("");
  lines.push("## 用語解説");
  for (const g of insight.glossary) {
    lines.push(`- **${g.term}**: ${g.explanation}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function savedListToMarkdown(items: SavedItem[]): string {
  const lines: string[] = [];
  lines.push("# 保存済み記事");
  lines.push("");
  lines.push(`生成日: ${new Date().toLocaleDateString("ja-JP")}`);
  lines.push("");
  for (const { article, notes } of items) {
    lines.push(`## ${article.title ?? article.url}`);
    lines.push("");
    lines.push(`- 出典: ${SOURCE_LABEL[article.sourceType]}${article.sourcePublishedAt ? ` (${article.sourcePublishedAt.slice(0, 10)})` : ""}`);
    lines.push(`- 元記事: ${article.url}`);
    lines.push("");
    if (notes.length > 0) {
      lines.push("### メモ");
      for (const n of notes) {
        lines.push(`- ${n.body.replace(/\n/g, "\n  ")}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

// The "portfolio-ready" combined export: stats + tag breakdown + every
// read/saved article with its notes + any GitHub repos referenced along the
// way. Meant to be pasted into a resume/GitHub README by hand (auto-syncing
// to an actual repo needs the still-deferred GitHub OAuth integration).
export function learningLogToMarkdown(data: LearningLogResponse): string {
  const { stats, githubRepos, items } = data;
  const lines: string[] = [];
  lines.push("# 技術学習ログ");
  lines.push("");
  lines.push(`生成日: ${new Date().toLocaleDateString("ja-JP")}`);
  lines.push("");
  lines.push("## サマリー");
  lines.push(`- 既読記事: ${stats.readCount}件`);
  lines.push(`- 保存記事: ${stats.savedCount}件`);
  lines.push(`- 直近30日の活動日数: ${stats.activeDaysLast30}日`);
  lines.push("");
  lines.push("## 分野別キャッチアップ状況");
  for (const { tag, count } of stats.tags) {
    if (count === 0) continue;
    lines.push(`- ${tag}: ${count}件`);
  }
  lines.push("");
  if (githubRepos.length > 0) {
    lines.push("## 触れたGitHubリポジトリ");
    for (const repo of githubRepos) {
      lines.push(`- [${repo}](https://github.com/${repo})`);
    }
    lines.push("");
  }
  lines.push("## 記事一覧");
  for (const item of items) {
    lines.push(`### ${item.title}`);
    lines.push("");
    lines.push(`- 出典: ${SOURCE_LABEL[item.sourceType]}`);
    lines.push(`- 元記事: ${item.url}`);
    lines.push(`- ステータス: ${[item.isRead ? "既読" : null, item.isBookmarked ? "保存済み" : null].filter(Boolean).join(" / ") || "未読"}`);
    if (item.notes.length > 0) {
      lines.push("- メモ:");
      for (const n of item.notes) lines.push(`  - ${n.replace(/\n/g, "\n    ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
