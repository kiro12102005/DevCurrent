export interface GithubStats {
  fullName: string;
  stars: number;
  lastCommitAt: string | null;
  latestReleaseTag: string | null;
  latestReleaseAt: string | null;
  url: string;
}
