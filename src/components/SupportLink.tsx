"use client";

import { Heart } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL;

// Opt-in, env-configured support link (GitHub Sponsors by default). Renders
// nothing until NEXT_PUBLIC_SPONSOR_URL is set, so an unconfigured deployment
// doesn't ship a dead placeholder link - see DEPLOY.md for setup.
export function SupportLink() {
  const t = useT();
  if (!SPONSOR_URL) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1.5">
        <Heart className="w-4 h-4" strokeWidth={2.25} /> {t.supportLink.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{t.supportLink.description}</p>
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-600 px-4 py-2 text-sm font-semibold text-white"
      >
        <Heart className="w-3.5 h-3.5" strokeWidth={2.25} /> {t.supportLink.button}
      </a>
    </div>
  );
}
