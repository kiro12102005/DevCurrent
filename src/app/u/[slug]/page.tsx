import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { computeLearningStats } from "@/lib/learningStats";
import { SharePageContent } from "@/components/SharePageContent";

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

// Server component (data fetch + generateMetadata) wrapping a client
// component (SharePageContent) so the language switcher's preference still
// applies to this public page - see SharePageContent.tsx.
export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const user = await prisma.user.findUnique({
    where: { shareSlug: slug },
    select: { id: true, publicNickname: true, createdAt: true },
  });
  if (!user) notFound();

  const stats = await computeLearningStats(user.id);
  const memberSince = user.createdAt.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  return (
    <SharePageContent
      nickname={user.publicNickname}
      memberSince={memberSince}
      readCount={stats.readCount}
      savedCount={stats.savedCount}
      activeDaysLast30={stats.activeDaysLast30}
      tags={stats.tags}
    />
  );
}
