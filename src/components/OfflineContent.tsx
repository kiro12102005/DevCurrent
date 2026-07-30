"use client";

import { WifiOff } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

export function OfflineContent() {
  const t = useT();

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="w-14 h-14 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
      <h1 className="text-lg font-bold brand-gradient-text">{t.offlinePage.title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{t.offlinePage.description}</p>
    </div>
  );
}
