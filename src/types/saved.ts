import type { SourceType } from "./insight";

export interface SavedArticle {
  id: string;
  url: string;
  title: string | null;
  sourceType: SourceType;
  sourcePublishedAt: string | null;
}

export interface SavedNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedItem {
  article: SavedArticle;
  isRead: boolean;
  notes: SavedNote[];
}
