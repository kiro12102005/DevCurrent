import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { computeMonthlySummaryStats } from "@/lib/monthlySummaryStats";
import { prisma } from "@/lib/prisma";

// Not a special opengraph-image.tsx file, so this is just a local constant
// (not auto-recognized Next.js metadata) - ImageResponse sets the actual
// Content-Type header itself.
const size = { width: 1080, height: 1080 };

// Requested directly via <img src="/api/share/monthly-summary"> (same-origin,
// so the session cookie rides along) - a personal "your month in review" card
// the logged-in user can download or share, distinct from the public all-time
// /u/[slug] opengraph-image (which is scoped to whoever opts into a share
// slug, not the viewer themself, and shows all-time not monthly totals).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const [stats, dbUser] = await Promise.all([
    computeMonthlySummaryStats(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { publicNickname: true } }),
  ]);

  const name = dbUser?.publicNickname || null;
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #6d5bf5, #3730a3)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, opacity: 0.85, display: "flex" }}>技術トレンド キャッチアップ</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 8, display: "flex" }}>
            {monthLabel}のキャッチアップ実績
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <StatRow value={stats.readCount} label="既読記事" />
          <StatRow value={stats.savedCount} label="保存した記事" />
          <StatRow value={stats.activeDays} label="活動した日数" />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {stats.topTag && (
            <div style={{ fontSize: 26, opacity: 0.85, marginBottom: 12, display: "flex" }}>
              今月よく見た分野: {stats.topTag}
            </div>
          )}
          <div style={{ fontSize: 28, fontWeight: 700, display: "flex" }}>
            {name ? `${name}さんの記録` : "技術トレンド キャッチアップ"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function StatRow({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
      <div style={{ fontSize: 96, fontWeight: 700, display: "flex", minWidth: 160 }}>{value}</div>
      <div style={{ fontSize: 32, opacity: 0.85, display: "flex" }}>{label}</div>
    </div>
  );
}
