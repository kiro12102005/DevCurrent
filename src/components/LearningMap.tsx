"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { LearningMapResponse } from "@/types/learningMap";

export function LearningMap() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<LearningMapResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-gray-500 text-sm">学習マップを見るにはログインしてください。</p>
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
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="既読" value={data.readCount} icon="✅" />
        <StatTile label="保存済み" value={data.savedCount} icon="🔖" />
        <StatTile label="直近30日の活動日数" value={data.activeDaysLast30} icon="🔥" />
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">分野別キャッチアップ状況</h3>
        {!hasAnyData ? (
          <p className="text-xs text-gray-400">
            まだデータがありません。フィードで記事を既読/保存すると、ここに分野別の内訳が表示されます。
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {data.tags.map(({ tag, count }) => (
              <li key={tag} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-gray-600 truncate">{tag}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full brand-gradient transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-700">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-3 flex flex-col items-center text-center">
      <span className="text-lg">{icon}</span>
      <span className="text-xl font-bold brand-gradient-text leading-tight">{value}</span>
      <span className="text-[10px] text-gray-500 leading-tight">{label}</span>
    </div>
  );
}
