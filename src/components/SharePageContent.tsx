"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

interface Props {
  nickname: string | null;
  memberSince: string;
  readCount: number;
  savedCount: number;
  activeDaysLast30: number;
  tags: { tag: string; count: number }[];
}

// Client component so the language switcher's preference applies here too -
// the parent page.tsx stays a Server Component (data fetch + generateMetadata
// for link-unfurl previews, which a Client Component page can't export).
export function SharePageContent({ nickname, memberSince, readCount, savedCount, activeDaysLast30, tags }: Props) {
  const t = useT();
  const maxCount = Math.max(1, ...tags.map((tag) => tag.count));
  const name = nickname || t.sharePageContent.defaultName;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 px-4 py-10">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t.sharePageContent.kicker}</p>
        <h1 className="text-2xl font-bold brand-gradient-text mt-1">
          {name}
          {t.sharePageContent.nameSuffix}
        </h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {memberSince}
          {t.sharePageContent.memberSinceSuffix}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t.sharePageContent.statRead} value={readCount} icon="✅" />
        <StatTile label={t.sharePageContent.statSaved} value={savedCount} icon="🔖" />
        <StatTile label={t.sharePageContent.statActiveDays} value={activeDaysLast30} icon="🔥" />
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">{t.sharePageContent.categoryTitle}</h2>
        {readCount === 0 && savedCount === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{t.sharePageContent.noDataYet}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {tags.map(({ tag, count }) => (
              <li key={tag} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-gray-600 dark:text-gray-400 truncate">{tag}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full brand-gradient" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          {t.appShell.title}
        </Link>{" "}
        {t.sharePageContent.footerSuffix}
      </p>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-3 flex flex-col items-center text-center">
      <span className="text-lg">{icon}</span>
      <span className="text-xl font-bold brand-gradient-text leading-tight">{value}</span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
    </div>
  );
}
