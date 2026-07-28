import type { SummarizeResponse } from "@/types/insight";
import type { SavedItem } from "@/types/saved";
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
