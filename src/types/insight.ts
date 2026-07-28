export interface Insight {
  summary: string;
  pros: string[];
  cons: string[];
  outlook: string;
  glossary: { term: string; explanation: string }[];
  githubRepo: string | null;
  isBreakingChange: boolean;
  breakingChangeSummary: string | null;
}

export type SourceType = "QIITA" | "ZENN" | "HACKER_NEWS" | "ARXIV" | "AI_TOOL_PICK" | "USER_SUBMITTED";

export interface SummarizeResponse {
  cached: boolean;
  article: {
    id: string;
    title: string | null;
    url: string;
    sourceType: SourceType;
    publishedAt: string | null;
    country: string | null;
  };
  insight: Insight;
}
