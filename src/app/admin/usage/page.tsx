import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { computeWeeklyUsageStats } from "@/lib/usageDigestStats";
import { SOURCE_LABEL } from "@/lib/sourceLabels";

export const metadata: Metadata = {
  title: "利用状況（運営者向け）",
  robots: { index: false, follow: false }, // operator-only, never link this from public nav or let it show up in search
};

export const dynamic = "force-dynamic"; // numbers change constantly, never statically cache

function formatDateJst(d: Date): string {
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric" });
}

// Gated by comparing the logged-in user's email to ADMIN_EMAIL rather than a
// DB role column - there's no admin/role concept in the User model (this app
// has exactly one operator), so adding one just for this single page would be
// overkill. notFound() (not a login redirect) both when unauthenticated and
// when logged in as the wrong account, so the page's existence isn't
// signalled to anyone else.
export default async function AdminUsagePage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const user = await getCurrentUser();
  if (!adminEmail || !user || user.email !== adminEmail) notFound();

  const stats = await computeWeeklyUsageStats();

  const rows: { label: string; value: string }[] = [
    { label: "新規登録ユーザー", value: `${stats.newUsers}人` },
    { label: "アクティブユーザー（既読/保存操作）", value: `${stats.activeUsers}人` },
    { label: "累計ユーザー数", value: `${stats.totalUsers}人` },
    { label: "URL要約の生成回数（BYOK）", value: `${stats.urlSummariesGenerated}回` },
    { label: "新規クロール記事数", value: `${stats.newArticlesCrawled}件` },
    { label: "フィードバック件数", value: `${stats.feedbackCount}件` },
  ];

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 px-4 pb-16 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline w-fit"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.25} /> アプリに戻る
        </Link>

        <div>
          <h1 className="text-2xl font-bold brand-gradient-text leading-tight">週次利用状況</h1>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
            {formatDateJst(stats.windowStart)} 〜 {formatDateJst(stats.windowEnd)}（直近7日間・毎週月曜0時にメールでも同じ内容が届きます）
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{r.value}</span>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">今週のエンゲージメント上位記事</h2>
          {stats.topArticles.length === 0 ? (
            <p className="text-sm text-gray-400">今週は対象記事がありませんでした。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.topArticles.map((a) => (
                <li
                  key={a.url}
                  className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <span className="text-xs text-gray-400 mr-1.5">
                    [{SOURCE_LABEL[a.sourceType as keyof typeof SOURCE_LABEL] ?? a.sourceType}・{a.engagementScore ?? 0}pt]
                  </span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {a.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 p-4 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <p>
            訪問者数・ページビューはこのアプリ自身のDBには保存していません。Vercel Analyticsを導入済みなので、
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline"
            >
              Vercelダッシュボード <ExternalLink className="w-3 h-3" strokeWidth={2.25} />
            </a>
            のプロジェクト &gt; Analytics タブから確認してください。
          </p>
        </div>
      </div>
    </div>
  );
}
