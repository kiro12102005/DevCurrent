"use client";

import { useEffect, useState } from "react";
import { GitFork, Star } from "lucide-react";
import type { GithubStats } from "@/types/github";
import { useT } from "@/lib/i18n/useT";
import type { Dictionary } from "@/lib/i18n/dictionaries/ja";

function timeAgo(iso: string, t: Dictionary["githubRepoCard"]): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return t.today;
  if (days < 30) return t.daysAgo.replace("{n}", String(days));
  if (days < 365) return t.monthsAgo.replace("{n}", String(Math.floor(days / 30)));
  return t.yearsAgo.replace("{n}", String(Math.floor(days / 365)));
}

// Read-only "primary source" check: real, live GitHub activity for the repo
// the article is about, instead of trusting the article's own framing of how
// active/maintained a project is.
export function GithubRepoCard({ repo }: { repo: string }) {
  const [stats, setStats] = useState<GithubStats | null | undefined>(undefined); // undefined = loading, null = unavailable
  const t = useT();

  useEffect(() => {
    queueMicrotask(() => {
      fetch(`/api/github-stats?repo=${encodeURIComponent(repo)}`)
        .then((res) => res.json())
        .then((data) => setStats(data.stats ?? null))
        .catch(() => setStats(null));
    });
  }, [repo]);

  if (stats === null) return null; // repo not found / API unavailable - fail silently, don't clutter the page
  if (stats === undefined) {
    return <div className="skeleton h-16 w-full rounded-xl" />;
  }

  return (
    <a
      href={stats.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
          <GitFork className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={2.25} /> {stats.fullName}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Star className="w-3.5 h-3.5" strokeWidth={2.25} fill="currentColor" /> {stats.stars.toLocaleString()}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
        {t.githubRepoCard.primarySourceLabel}
        {stats.lastCommitAt && t.githubRepoCard.lastCommitTemplate.replace("{value}", timeAgo(stats.lastCommitAt, t.githubRepoCard))}
        {stats.latestReleaseTag &&
          t.githubRepoCard.latestReleaseTemplate
            .replace("{tag}", stats.latestReleaseTag)
            .replace("{time}", timeAgo(stats.latestReleaseAt!, t.githubRepoCard))}
      </p>
    </a>
  );
}
