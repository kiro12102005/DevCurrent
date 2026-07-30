// JA-only for now - legal-ish prose page, out of scope for the i18n sweep
// (see src/lib/i18n/) given the mistranslation risk on this specific content.
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Database, Share2, Mail, Trash2, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜技術トレンド キャッチアップ",
  description: "技術トレンド キャッチアップが収集する情報とその利用目的についてまとめています。",
};

const CONTACT_EMAIL = "contact.somakida@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-5 px-4 pb-16 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline w-fit"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.25} /> アプリに戻る
        </Link>

        <div>
          <h1 className="text-2xl font-bold brand-gradient-text leading-tight">プライバシーポリシー</h1>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            技術トレンド キャッチアップ（以下「本アプリ」）が収集する情報の種類と利用目的についてまとめています。
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">最終更新日: 2026年7月</p>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
            <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={2.25} /> このページについて
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            本アプリは個人開発のポートフォリオプロジェクトです。このページは実際にアプリが行っているデータの取り扱いを正確に記載するよう努めていますが、法的な助言や保証を提供するものではありません。
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
            <Database className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={2.25} />
            収集する情報
          </h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex flex-col gap-2">
            <p>
              フィード閲覧・URL要約・AIツール一覧の閲覧は、アカウント登録なしでご利用いただけます。以下はアカウント登録・各機能利用時にのみ収集します。
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>メールアドレス・パスワード</strong>: アカウント登録時。パスワードはハッシュ化して保存し、平文では保存しません。</li>
              <li><strong>既読・ブックマーク状態、記事へのメモ</strong>: ログイン中に記事を既読/保存操作した場合。</li>
              <li><strong>興味タグ・技術キーワード</strong>: パーソナライズ通知を設定した場合（任意）。</li>
              <li><strong>公開ニックネーム</strong>: 学習実績の共有ページを有効化した場合のみ（任意、メールアドレスは公開されません）。</li>
              <li><strong>フィードバック内容</strong>: フィードバックフォーム送信時のメッセージ・任意入力の連絡先メールアドレス。</li>
              <li><strong>Push通知の購読情報</strong>: 通知を許可した場合、ブラウザが発行する購読エンドポイント。</li>
              <li><strong>セッションCookie</strong>: ログイン状態の維持のみに使用（httpOnly、第三者への送信なし）。</li>
            </ul>
            <p>
              広告目的のトラッキング・行動解析ツール（Google Analytics等）は導入していません。IPアドレスを紐付けて保存する処理も行っていません。
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={2.25} />
            利用している外部サービス
          </h2>
          <ul className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed list-disc list-inside space-y-1.5">
            <li><strong>Supabase</strong>: データベースのホスティング。</li>
            <li><strong>Vercel</strong>: アプリ本体のホスティング、ポッドキャスト音声ファイルの保存（Vercel Blob）。</li>
            <li><strong>Resend</strong>: 週次ダイジェストメール・フィードバック通知メールの送信（オプトインした場合のみ）。</li>
            <li>
              <strong>Google Gemini API</strong>: 記事要約・模擬面接・ポッドキャスト等のAI機能。ユーザー個人が能動的に使う機能（URL要約・模擬面接・ハンズオン生成など）は各自のGemini
              APIキー（BYOK）で処理され、そのキーはブラウザのlocalStorageにのみ保存されサーバーには保存されません。注目ピックアップの自動要約など全員で共有するコンテンツの生成のみ運営者のAPIキーを使用します。
            </li>
            <li><strong>ブラウザのPushサービス</strong>: 通知を許可した場合、Web Push標準に基づきブラウザベンダー（Google/Apple/Mozilla等）が提供するプッシュ配信サービスを経由します。</li>
            <li><strong>GitHub公開API</strong>: リポジトリチェック・スター数表示機能で、認証情報を伴わない公開情報の取得のみ行います。</li>
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={2.25} />
            データの削除・保持期間
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            アカウントおよび紐づく既読/保存状態・メモ・Push購読情報の削除をご希望の場合は、下記の連絡先までメールでご連絡ください。確認の上、対応いたします。現時点ではアプリ内からのアカウント自己削除機能は未実装です。フィードバック送信時に入力したメールアドレスは、対応完了後に削除することが可能です。
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
            <Mail className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={2.25} />
            お問い合わせ
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            本ページの内容やデータの取り扱いに関するご質問は、
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {CONTACT_EMAIL}
            </a>
            までご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
