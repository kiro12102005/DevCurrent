"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useUnreadAnnouncementCount } from "@/lib/announcements";
import { AnnouncementsSection } from "./AnnouncementsSection";
import { useT } from "@/lib/i18n/useT";

// Header-level icon (alongside Settings/AuthMenu) rather than buried inside
// the My Page hub - operator announcements (system changes, outages, ...)
// are meant to be noticed at a glance, not discovered by opening a sub-tab.
export function AnnouncementsButton() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadAnnouncementCount();
  const t = useT();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.announcements.toggleLabel}
        title={t.announcements.toggleLabel}
        className="relative flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 w-7 h-7 shrink-0 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
      >
        <Bell className="w-3.5 h-3.5" strokeWidth={2.25} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-2 sm:w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 shadow-xl shadow-indigo-900/10 z-20">
          <p className="px-1 mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t.announcements.panelTitle}</p>
          <AnnouncementsSection />
        </div>
      )}
    </div>
  );
}
