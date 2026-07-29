import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "技術トレンド キャッチアップ";

// The default link-preview card for the root site (X/LINE/Slack/Qiita etc.
// unfurl this when the bare app URL is shared) - distinct from
// /u/[slug]/opengraph-image.tsx, which shows a specific user's stats.
export default function OgImage() {
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
        <div style={{ fontSize: 64, fontWeight: 700, display: "flex" }}>技術トレンド キャッチアップ</div>
        <div style={{ fontSize: 30, opacity: 0.85, marginTop: 20, display: "flex" }}>
          最新技術ニュースを自動収集 + AIで深掘り要約
        </div>
        <div style={{ fontSize: 22, opacity: 0.7, marginTop: 36, display: "flex" }}>
          Qiita / Zenn / Hacker News / ArXiv
        </div>
      </div>
    ),
    { ...size }
  );
}
