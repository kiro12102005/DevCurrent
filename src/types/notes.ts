import type { SourceType } from "./insight";

export interface NoteArticle {
  id: string;
  url: string;
  title: string | null;
  sourceType: SourceType;
  sourcePublishedAt: string | null;
}

export interface UserNoteDto {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  article: NoteArticle;
}
