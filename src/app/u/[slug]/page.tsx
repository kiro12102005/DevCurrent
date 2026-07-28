import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { computeLearningStats } from "@/lib/learningStats";

export const dynamic = "force-dynamic"; // stats change as the user keeps reading - never statically cache someone's page

// So the link actually looks like something when pasted into LinkedIn / a
// job-hunting site / Slack - without this it falls back to the app's generic
// metadata, which defeats the point of a personal share link.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const user = await prisma.user.findUnique({ where: { shareSlug: slug }, select: { publicNickname: true } });
  if (!user) return { title: "ページが見つかりません" };

  const name = user.publicNickname || "ユーザー";
  const title = `${name}さんの学習実績 | 技術トレンド キャッチアップ`;
  const description = `${name}さんが技術トレンド キャッチアップでキャッチアップしてきた記事・分野別の学習マップを見る`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const user = await prisma.user.findUnique({
    where: { shareSlug: slug },
    select: { id: true, publicNickname: true, createdAt: true },
  });
  if (!user) notFound();

  const stats = await computeLearningStats(user.id);
  const maxCount = Math.max(1, ...stats.tags.map((t) => t.count));
  const memberSince = user.createdAt.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 px-4 py-10">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">技術トレンド キャッチアップ 学習実績</p>
        <h1 className="text-2xl font-bold brand-gradient-text mt-1">{user.publicNickname || "ユーザー"}さんの学習マップ</h1>
        <p className="text-xs text-gray-400 mt-1">{memberSince}〜キャッチアップ中</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="既読記事" value={stats.readCount} icon="✅" />
        <StatTile label="保存記事" value={stats.savedCount} icon="🔖" />
        <StatTile label="直近30日の活動日数" value={stats.activeDaysLast30} icon="🔥" />
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
        <h2 className="font-bold text-gray-800 mb-3">分野別キャッチアップ状況</h2>
        {stats.readCount === 0 && stats.savedCount === 0 ? (
          <p className="text-xs text-gray-400">まだキャッチアップした記事がありません。</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {stats.tags.map(({ tag, count }) => (
              <li key={tag} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-gray-600 truncate">{tag}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full brand-gradient" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-700">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <Link href="/" className="text-indigo-600 hover:underline">
          技術トレンド キャッチアップ
        </Link>{" "}
        で自分の学習実績も可視化できます
      </p>
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
