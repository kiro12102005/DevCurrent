import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getWeeklyPicks, type WeeklyPick } from "@/lib/weeklyPicks";

const PICKS_PER_SOURCE = 3;

// User-supplied text (feedback messages) gets interpolated into HTML email
// bodies below - must be escaped, unlike the rest of this file's templates
// which only ever embed our own generated article titles/URLs. Exported for
// unit testing (see email.test.ts).
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDigestHtml(picks: WeeklyPick[]): string {
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

  const picks = await getWeeklyPicks(PICKS_PER_SOURCE);
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

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug: "🐛 バグ報告",
  rating: "⭐ 評価",
  suggestion: "💡 改善提案",
  other: "💬 その他",
};

// Best-effort notification to the operator when someone submits the in-app
// feedback form - the Feedback DB row is the source of truth regardless
// (see POST /api/feedback), this is just so the operator doesn't have to
// remember to go check the table. Silently no-ops if RESEND_API_KEY or
// FEEDBACK_NOTIFY_EMAIL isn't configured, same degrade-gracefully pattern
// as sendWeeklyDigest above.
export async function notifyFeedbackSubmission(feedback: {
  type: string;
  message: string;
  rating: number | null;
  email: string | null;
}): Promise<void> {
  const client = resendClient();
  const notifyTo = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (!client || !notifyTo) return;

  const typeLabel = FEEDBACK_TYPE_LABELS[feedback.type] ?? feedback.type;
  const ratingLine = feedback.rating
    ? `<p><strong>評価:</strong> ${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)}</p>`
    : "";
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:16px;">新しいフィードバック: ${typeLabel}</h1>
      ${ratingLine}
      <p><strong>連絡先:</strong> ${feedback.email ? escapeHtml(feedback.email) : "未記入"}</p>
      <p><strong>内容:</strong></p>
      <p style="white-space:pre-wrap;border-left:3px solid #6d5bf5;padding-left:12px;">${escapeHtml(feedback.message)}</p>
    </div>
  `;

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  try {
    await client.emails.send({ from, to: notifyTo, subject: `[フィードバック] ${typeLabel}`, html });
  } catch (err) {
    console.error("[feedback] operator notification email failed:", err);
  }
}
