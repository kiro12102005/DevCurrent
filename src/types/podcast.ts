export interface PodcastEpisodeDto {
  id: string;
  date: string;
  audioUrl: string;
  script: string;
  durationSec: number | null;
  createdAt: string;
}
