"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type Announcement = { id: string; title: string; body: string; createdAt: string };

const STORAGE_KEY = "announcements_last_seen_at";
const CHANGE_EVENT = "announcements-last-seen-changed";

export function getLastSeenAt(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

// Called once the list has actually been opened/viewed (see
// AnnouncementsSection), not just fetched - the caller passes the newest
// createdAt it rendered, so the unread badge elsewhere can compare against
// it without needing its own "has this been read" state.
export function markAnnouncementsSeen(latestCreatedAt: string): void {
  if (!latestCreatedAt) return;
  const current = getLastSeenAt();
  if (current && current >= latestCreatedAt) return;
  window.localStorage.setItem(STORAGE_KEY, latestCreatedAt);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getServerSnapshot(): string {
  return "";
}

export function useLastSeenAt(): string {
  return useSyncExternalStore(subscribe, getLastSeenAt, getServerSnapshot);
}

// Announcements are a small, infrequent table (capped at 50 rows server-side)
// so it's cheap enough to fetch independently wherever something needs to
// know about unread ones, rather than adding a shared data-fetching layer -
// this app doesn't use one anywhere else (every section just fetches its
// own data with useEffect).
export function useUnreadAnnouncementCount(): number {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const lastSeenAt = useLastSeenAt();

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => setAnnouncements(data.announcements ?? []))
      .catch(() => {});
  }, []);

  if (!lastSeenAt) return announcements.length;
  return announcements.filter((a) => a.createdAt > lastSeenAt).length;
}
