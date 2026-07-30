"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { markAnnouncementsSeen, type Announcement } from "@/lib/announcements";
import { formatArticleDate } from "@/lib/formatDate";
import { useT } from "@/lib/i18n/useT";

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const t = useT();

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => {
        const list: Announcement[] = data.announcements ?? [];
        setAnnouncements(list);
        // Sorted newest-first by the API, so [0] is the latest seen.
        if (list.length > 0) markAnnouncementsSeen(list[0].createdAt);
      })
      .catch(() => setAnnouncements([]));
  }, []);

  if (announcements === null) {
    return <div className="skeleton h-24 w-full rounded-lg" />;
  }

  if (announcements.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">{t.announcements.emptyState}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {announcements.map((a) => (
        <li key={a.id} className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-start gap-1.5">
            <Megaphone className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" strokeWidth={2.25} /> {a.title}
          </h3>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{a.body}</p>
          <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">{formatArticleDate(a.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
