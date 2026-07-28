import type { FeedArticle } from "./feed";

export interface SearchResponse {
  query: string;
  results: FeedArticle[];
  offset: number;
  count: number;
  total: number;
  hasMore: boolean;
}
