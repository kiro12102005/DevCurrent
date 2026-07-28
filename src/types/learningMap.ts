export interface LearningMapResponse {
  readCount: number;
  savedCount: number;
  activeDaysLast30: number;
  tags: { tag: string; count: number }[];
}
