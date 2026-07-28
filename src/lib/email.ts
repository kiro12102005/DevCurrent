import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { SourceType } from "@/generated/prisma";
import { jstWeekRange, jstTodayString } from "@/lib/dateRange";

const FEATURED_SOURCES = [SourceType.QIITA, SourceType.ZENN, SourceType.HACKER_NEWS] as const;
const PICKS_PER_SOURCE = 3;

interface DigestArticle {
  title: string;
  url: string;
}

async function getWeeklyPicks(): Promise<DigestArticle[]> {
  const [rangeStart, rangeEnd] = jstWeekRange(jstTodayString());
  const bySource = await Promise.all(
    FEATURED_SOURCES.map((sourceType) =>
      prisma.article.findMany({
        where: { sourceType, sourcePublishedAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { engagementScore: "desc" },
        take: PICKS_PER_SOURCE,
        select: { title: true, url: true },
      })
    )
  );
  return bySource.flat().filter((a): a is DigestArticle => Boolean(a.title));
}

function renderDigestHtml(picks: DigestArticle[]): string {
  const items = picks
    .map(
      (a) =>
        `<li style="margin-bottom:12px;"><a href="${a.url}" style="color:#4f46e5;font-weight:600;text-decoration:none;">${a.title}</a></li>`
    )
    .join("");
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:18px;background:linear-gradient(135deg,#6d5bf5,#3730a3);-webkit-background-clip:text;background-clip:text;color:transparent;">今週の技術トレンド キャッチアップ</h1>
      <p style="color:#555;font-size:14px;">今週注目された記事のピックアップです。</p>
      <ul style="padding-left:20px;">${items}</ul>
      <p style="color:#999;font-size:12px;margin-top:24px;">配信停止は アプリ内の アカウントメニュー から行えます。</p>
    </div>
  `;
}

function resendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// Sends the weekly digest to every user who opted in (User.wantsWeeklyDigest).
// No-op (not an error) if RESEND_API_KEY isn't configured, matching this
// app's pattern of degrading gracefully when an optional integration key is
// missing (see GEMINI_API_KEY in refresh.ts).
export async function sendWeeklyDigest(): Promise<{ sent: number; skipped: string }> {
  const client = resendClient();
  if (!client) {
    return { sent: 0, skipped: "RESEND_API_KEY未設定のため週次ダイジェストはスキップされました" };
  }

  const picks = await getWeeklyPicks();
  if (picks.length === 0) {
    return { sent: 0, skipped: "今週のピックアップ記事がありませんでした" };
  }

  const recipients = await prisma.user.findMany({
    where: { wantsWeeklyDigest: true },
    select: { email: true },
  });
  if (recipients.length === 0) {
    return { sent: 0, skipped: "配信対象（配信オプトインしたユーザー）がいません" };
  }

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const html = renderDigestHtml(picks);

  const results = await Promise.allSettled(
    recipients.map((r) =>
      client.emails.send({
        from,
        to: r.email,
        subject: "今週の技術トレンド キャッチアップ",
        html,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, skipped: "" };
}
