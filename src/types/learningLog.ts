import type { LearningMapResponse } from "./learningMap";
import type { SourceType } from "./insight";

export interface LearningLogItem {
  title: string;
  url: string;
  sourceType: SourceType;
  isRead: boolean;
  isBookmarked: boolean;
  notes: string[];
}

export interface LearningLogResponse {
  stats: LearningMapResponse;
  githubRepos: string[];
  items: LearningLogItem[];
}
