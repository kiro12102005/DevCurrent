// Fixed topic-tag vocabulary shared by Article.tags (auto-derived, see
// deriveTags below) and User.interestTags (user-selected in account settings).
// Keeping this a closed list - rather than freeform/Gemini-derived tags - means
// tagging every crawled article costs zero extra API calls: it's just keyword
// matching against the title, run locally in refreshFeed().
export const TAG_OPTIONS = [
  "AI・機械学習",
  "フロントエンド",
  "バックエンド",
  "モバイル",
  "インフラ・クラウド",
  "セキュリティ",
  "データベース",
  "開発ツール",
] as const;

export type Tag = (typeof TAG_OPTIONS)[number];

// Title keyword -> tag. Checked case-insensitively against the (already
// Japanese-translated, where applicable) article title. Intentionally simple:
// a title can match multiple tags, and most articles will match at least one
// since the keyword lists are broad, but false negatives (untagged articles)
// are fine - tags only ever narrow personalized push targeting, never gate
// feed visibility.
const TAG_KEYWORDS: Record<Tag, string[]> = {
  "AI・機械学習": ["ai", "llm", "gpt", "gemini", "claude", "機械学習", "生成ai", "深層学習", "ml", "エージェント", "agent"],
  フロントエンド: ["react", "next.js", "nextjs", "vue", "svelte", "css", "typescript", "javascript", "フロントエンド", "ui", "tailwind"],
  バックエンド: ["api", "サーバー", "node.js", "nodejs", "go言語", "golang", "rust", "python", "django", "rails", "バックエンド"],
  モバイル: ["ios", "android", "swift", "kotlin", "flutter", "react native", "モバイル", "アプリ"],
  "インフラ・クラウド": ["aws", "gcp", "azure", "kubernetes", "docker", "terraform", "クラウド", "インフラ", "サーバーレス"],
  セキュリティ: ["セキュリティ", "脆弱性", "認証", "暗号", "security", "vulnerability", "phishing"],
  データベース: ["sql", "postgres", "mysql", "database", "データベース", "prisma", "supabase"],
  開発ツール: ["vscode", "github", "git", "cli", "エディタ", "開発ツール", "devops", "ci/cd"],
};

export function deriveTags(title: string): Tag[] {
  const lower = title.toLowerCase();
  return TAG_OPTIONS.filter((tag) => TAG_KEYWORDS[tag].some((kw) => lower.includes(kw.toLowerCase())));
}
