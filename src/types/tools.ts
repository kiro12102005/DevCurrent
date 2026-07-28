export interface AiToolPickDto {
  id: string;
  name: string;
  category: string;
  summary: string;
  recommendedFor: string;
  useCaseExample: string;
  sourceUrl: string | null;
  publishedAt: string | null;
}
