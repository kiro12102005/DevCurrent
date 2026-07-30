import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getWeeklyPicks, type WeeklyPick } from "@/lib/weeklyPicks";
import { computeWeeklyUsageStats, type WeeklyUsageStats } from "@/lib/usageDigestStats";
import { SOURCE_LABEL } from "@/lib/sourceLabels";

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
  email: string | null;
}): Promise<void> {
  const client = resendClient();
  const notifyTo = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (!client || !notifyTo) return;

  const typeLabel = FEEDBACK_TYPE_LABELS[feedback.type] ?? feedback.type;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:16px;">新しいフィードバック: ${typeLabel}</h1>
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

// Best-effort alert when recordAndCheckAbuse (lib/abuseAlert.ts) sees a
// single IP cross its in-memory threshold on a sensitive endpoint. Purely
// informational - doesn't block anything itself (see DEPLOY.md section 7 for
// the actual Vercel Firewall rate-limit rule, which can be promoted to real
// blocking after reviewing traffic). Separate env var from
// FEEDBACK_NOTIFY_EMAIL so the two concerns can be routed differently later.
// Silently no-ops if RESEND_API_KEY or ABUSE_ALERT_EMAIL isn't configured,
// same degrade-gracefully pattern as the rest of this file.
export async function notifyAbuseDetected(info: {
  ip: string;
  path: string;
  hitCount: number;
  windowMinutes: number;
}): Promise<void> {
  const client = resendClient();
  const notifyTo = process.env.ABUSE_ALERT_EMAIL;
  if (!client || !notifyTo) return;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:16px;">⚠️ 不審なアクセスを検知しました</h1>
      <p><strong>IPアドレス:</strong> ${escapeHtml(info.ip)}</p>
      <p><strong>エンドポイント:</strong> ${escapeHtml(info.path)}</p>
      <p><strong>直近${info.windowMinutes}分間のリクエスト数:</strong> ${info.hitCount}</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        これは通知のみで、自動ブロックはしていません。実際にブロックする場合はVercel Firewallのルールを有効化してください。
      </p>
    </div>
  `;

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  try {
    await client.emails.send({ from, to: notifyTo, subject: `[不審なアクセス検知] ${info.path}`, html });
  } catch (err) {
    console.error("[abuseAlert] notification email failed:", err);
  }
}

function formatDateJst(d: Date): string {
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric" });
}

function renderUsageDigestHtml(stats: WeeklyUsageStats, appUrl: string): string {
  const topArticlesHtml = stats.topArticles.length
    ? stats.topArticles
        .map(
          (a) =>
            `<li style="margin-bottom:8px;">
              <span style="color:#999;font-size:12px;">[${SOURCE_LABEL[a.sourceType as keyof typeof SOURCE_LABEL] ?? a.sourceType}・${a.engagementScore ?? 0}pt]</span>
              <a href="${a.url}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(a.title)}</a>
            </li>`
        )
        .join("")
    : `<li style="color:#999;">今週は対象記事がありませんでした。</li>`;

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:18px;background:linear-gradient(135deg,#6d5bf5,#3730a3);-webkit-background-clip:text;background-clip:text;color:transparent;">週次利用状況サマリー</h1>
      <p style="color:#555;font-size:13px;">${formatDateJst(stats.windowStart)} 〜 ${formatDateJst(stats.windowEnd)}</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#555;">新規登録ユーザー</td><td style="text-align:right;font-weight:600;">${stats.newUsers}人</td></tr>
        <tr><td style="padding:6px 0;color:#555;">アクティブユーザー（既読/保存操作）</td><td style="text-align:right;font-weight:600;">${stats.activeUsers}人</td></tr>
        <tr><td style="padding:6px 0;color:#555;">累計ユーザー数</td><td style="text-align:right;font-weight:600;">${stats.totalUsers}人</td></tr>
        <tr><td style="padding:6px 0;color:#555;">URL要約の生成回数（BYOK）</td><td style="text-align:right;font-weight:600;">${stats.urlSummariesGenerated}回</td></tr>
        <tr><td style="padding:6px 0;color:#555;">新規クロール記事数</td><td style="text-align:right;font-weight:600;">${stats.newArticlesCrawled}件</td></tr>
        <tr><td style="padding:6px 0;color:#555;">フィードバック件数</td><td style="text-align:right;font-weight:600;">${stats.feedbackCount}件</td></tr>
      </table>

      <h2 style="font-size:14px;color:#333;">今週のエンゲージメント上位記事</h2>
      <ul style="padding-left:20px;font-size:13px;">${topArticlesHtml}</ul>

      <div style="margin-top:24px;padding:12px;background:#f5f5f7;border-radius:8px;font-size:12px;color:#555;">
        <p style="margin:0 0 6px 0;"><strong>もっと詳しく見るには:</strong></p>
        <p style="margin:0 0 6px 0;">
          このメールに含まれない訪問者数・ページビューは
          <strong>Vercelダッシュボード &gt; プロジェクト &gt; Analytics タブ</strong>から確認できます
          （このメールの数字はアプリ自身のDBから集計したもので、Vercel Analyticsのデータとは別物です）。
        </p>
        <p style="margin:0;">
          ユーザー・記事単位のより詳細な内訳は <a href="${appUrl}/admin/usage" style="color:#4f46e5;">${appUrl}/admin/usage</a>
          （運営者アカウントでログイン後にアクセス可能）で確認できます。
        </p>
      </div>
    </div>
  `;
}

// Weekly operator-only summary of the app's own usage, sent to
// ADMIN_EMAIL - separate concern from sendWeeklyDigest (which goes to
// opted-in end users with article picks, not operator metrics). Computed
// from our own Postgres data since Vercel Web Analytics has no read API on
// the Hobby plan (see computeWeeklyUsageStats). Same degrade-gracefully
// pattern as the rest of this file: no-ops if RESEND_API_KEY or ADMIN_EMAIL
// isn't configured.
export async function sendUsageDigest(): Promise<{ sent: boolean; skipped: string }> {
  const client = resendClient();
  const notifyTo = process.env.ADMIN_EMAIL;
  if (!client || !notifyTo) {
    return { sent: false, skipped: "RESEND_API_KEYまたはADMIN_EMAIL未設定のため週次利用状況サマリーはスキップされました" };
  }

  const stats = await computeWeeklyUsageStats();
  const appUrl = "https://dev-current.vercel.app"; // matches metadataBase in src/app/layout.tsx
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  try {
    await client.emails.send({
      from,
      to: notifyTo,
      subject: `[週次サマリー] 新規${stats.newUsers}人・アクティブ${stats.activeUsers}人（${formatDateJst(stats.windowStart)}〜${formatDateJst(stats.windowEnd)}）`,
      html: renderUsageDigestHtml(stats, appUrl),
    });
    return { sent: true, skipped: "" };
  } catch (err) {
    console.error("[usageDigest] notification email failed:", err);
    return { sent: false, skipped: err instanceof Error ? err.message : "送信に失敗しました" };
  }
}
