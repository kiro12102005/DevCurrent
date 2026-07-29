import type { SourceType } from "@/types/insight";

export interface PodcastSourceArticle {
  title: string;
  url: string;
  sourceType: SourceType;
  summary: string | null;
}

export interface PodcastEpisodeDto {
  id: string;
  date: string;
  audioUrl: string;
  script: string;
  durationSec: number | null;
  sourceArticles: PodcastSourceArticle[];
  createdAt: string;
}
