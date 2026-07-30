import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { AnnouncementAdminPanel } from "@/components/admin/AnnouncementAdminPanel";

export const metadata: Metadata = {
  title: "お知らせ管理（運営者向け）",
  robots: { index: false, follow: false }, // operator-only, never link this from public nav or let it show up in search
};

export const dynamic = "force-dynamic";

// Gated the same way as /admin/usage (logged-in user's email === ADMIN_EMAIL,
// notFound() rather than a login redirect so the page's existence isn't
// signalled to anyone else).
export default async function AdminAnnouncementsPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const user = await getCurrentUser();
  if (!adminEmail || !user || user.email !== adminEmail) notFound();

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
          <h1 className="text-2xl font-bold brand-gradient-text leading-tight">お知らせ管理</h1>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
            公開すると全ユーザーの「お知らせ」タブに表示され、プッシュ通知購読者全員に即時通知が送られます（興味タグ等の設定に関わらず全員に届きます）。
          </p>
        </div>

        <AnnouncementAdminPanel />
      </div>
    </div>
  );
}
