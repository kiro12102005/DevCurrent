import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { computeLearningStats } from "@/lib/learningStats";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "技術トレンド キャッチアップ 学習実績";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await prisma.user.findUnique({ where: { shareSlug: slug }, select: { id: true, publicNickname: true } });
  const stats = user ? await computeLearningStats(user.id) : null;
  const name = user?.publicNickname || "ユーザー";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #6d5bf5, #3730a3)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85, display: "flex" }}>技術トレンド キャッチアップ 学習実績</div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 16, display: "flex" }}>{name}さんの学習マップ</div>
        {stats && (
          <div style={{ display: "flex", gap: 48, marginTop: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 700, display: "flex" }}>{stats.readCount}</div>
              <div style={{ fontSize: 22, opacity: 0.85, display: "flex" }}>既読記事</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 700, display: "flex" }}>{stats.savedCount}</div>
              <div style={{ fontSize: 22, opacity: 0.85, display: "flex" }}>保存記事</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 700, display: "flex" }}>{stats.activeDaysLast30}</div>
              <div style={{ fontSize: 22, opacity: 0.85, display: "flex" }}>直近30日の活動日数</div>
            </div>
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
