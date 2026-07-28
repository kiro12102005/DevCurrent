export interface RepoCheckMatch {
  keyword: string;
  articleTitle: string;
  articleUrl: string;
  breakingChangeSummary: string;
}

export interface RepoCheckResponse {
  repo: string;
  dependencyCount: number;
  matches: RepoCheckMatch[];
}
