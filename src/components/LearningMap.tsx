"use client";

import { useEffect, useState } from "react";
import { Lock, FileText, CircleCheckBig, Bookmark, Flame, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { LearningMapResponse } from "@/types/learningMap";
import type { LearningLogResponse } from "@/types/learningLog";
import { downloadTextFile } from "@/lib/download";
import { learningLogToMarkdown } from "@/lib/exportMarkdown";

export function LearningMap() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<LearningMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/learning-log");
      const log = (await res.json()) as LearningLogResponse;
      downloadTextFile("学習ログ.md", learningLogToMarkdown(log));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      setLoading(true);
      fetch("/api/learning-map")
        .then((res) => res.json())
        .then((d) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    });
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Lock className="w-10 h-10 mb-1 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-gray-500 dark:text-gray-400 text-sm">学習マップを見るにはログインしてください。</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-3">
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.tags.map((t) => t.count));
  const hasAnyData = data.readCount > 0 || data.savedCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
        >
          <FileText className="w-3 h-3" strokeWidth={2.25} /> {exporting ? "生成中..." : "技術学習ログをMDで出力"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="既読" value={data.readCount} icon={CircleCheckBig} />
        <StatTile label="保存済み" value={data.savedCount} icon={Bookmark} />
        <StatTile label="直近30日の活動日数" value={data.activeDaysLast30} icon={Flame} />
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">分野別キャッチアップ状況</h3>
        {!hasAnyData ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            まだデータがありません。フィードで記事を既読/保存すると、ここに分野別の内訳が表示されます。
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {data.tags.map(({ tag, count }) => (
              <li key={tag} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-gray-600 dark:text-gray-400 truncate">{tag}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full brand-gradient transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-3 flex flex-col items-center text-center">
      <Icon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" strokeWidth={2.25} />
      <span className="text-xl font-bold brand-gradient-text leading-tight">{value}</span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
    </div>
  );
}
