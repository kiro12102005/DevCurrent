import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Lightbulb,
  Wallet,
  ServerCrash,
  Clock,
  AlertTriangle,
  Smartphone,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "この技術スタックについて｜技術トレンド キャッチアップ",
  description:
    "技術トレンド キャッチアップの設計判断まとめ - なぜこの構成にしたか、本番で踏んだ障害とその修正、コスト設計、品質保証の取り組みを開発者向けに公開しています。",
};

type Section = {
  icon: typeof Lightbulb;
  title: string;
  tone: "default" | "incident";
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    icon: Lightbulb,
    title: "なぜこのアプリを作ったか",
    tone: "default",
    body: (
      <p>
        就活生・エンジニア未経験者向けに、技術記事URLを「要約」「メリット・懸念点」「今後の展望」「用語解説」に変換する学習アプリです。
        単なる記事まとめアプリで終わらせないために、「他のアプリにはない実利用価値」を常に基準に機能を選んでいます
        （技術論争サマライザー・リポジトリチェック・音声ポッドキャスト・AIエディタ設定エクスポートなど）。
      </p>
    ),
  },
  {
    icon: Wallet,
    title: "コスト設計: BYOKと運営者キーの使い分け",
    tone: "default",
    body: (
      <>
        <p className="mb-2">
          Gemini APIの無料枠だけで運用を続けるために、コスト負担者を「誰のためのAI呼び出しか」で明確に分けています。
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>BYOK（ユーザー自身のキー）</strong>: URL手動要約・模擬面接AI・3分ハンズオン・AIエディタ設定エクスポートなど、
            そのユーザー個人が能動的にトリガーする生成はすべてBYOK。ブラウザのlocalStorageにのみキーを保存し、サーバーのDBには一切保存しません。
          </li>
          <li>
            <strong>運営者キー（共有コンテンツ）</strong>: 注目ピックアップの自動要約・AIツールピックアップ・音声ポッドキャストなど、
            1回生成すれば全員が使い回せるものは運営者のAPIキーを使い、クロール時点でエンゲージメント上位のみに絞って無料枠を使い切らない設計にしています。
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: ServerCrash,
    title: "本番障害: Postgresの接続プール枯渇",
    tone: "incident",
    body: (
      <div className="flex flex-col gap-1.5">
        <p>
          <strong>何が起きたか:</strong> SQLiteでのMVP開発からSupabase Postgresへ本番移行した直後、フィード更新処理が新規記事を
          Promise.allで一括作成する際にプールド接続を使い切り、書き込みがタイムアウトしました。
        </p>
        <p>
          <strong>なぜローカルで気づけなかったか:</strong> SQLiteには接続数の上限という概念がなく、100件以上の同時書き込みも問題なく通っていました。
          Postgresに切り替えて初めて顕在化する、環境差に起因するバグでした。
        </p>
        <p>
          <strong>修正:</strong> 同時実行数を制限して関数を実行するヘルパーを実装し、Promise.allでの一括発火をやめました。
          本番で336件の記事作成が成功することを確認して修正完了としています。
        </p>
      </div>
    ),
  },
  {
    icon: Clock,
    title: "スケジューラ設計: Vercel CronとGitHub Actionsの使い分け",
    tone: "default",
    body: (
      <p>
        Vercel Hobbyプランはcronの実行頻度が1日1回までに制限されています。一方フィード更新は3時間おきに回したいため、
        頻度で使い分ける設計にしました。週次程度で十分なジョブはVercel Cron、3時間おきのフィード更新や毎日決まった時刻のポッドキャスト生成は
        GitHub Actionsから叩いています。両方から同じエンドポイントが叩かれても壊れないよう、各エンドポイントは冪等に設計してあります。
      </p>
    ),
  },
  {
    icon: AlertTriangle,
    title: "Next.js 16の破壊的変更に注意しながら開発した経験",
    tone: "incident",
    body: (
      <>
        <p className="mb-2">
          このプロジェクトは「学習済みの知識が通用しない前提で読む」ことを明示的に要求される環境でした。実際に踏んだ・事前に踏まないよう対策した変更があります。
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>paramsがPromiseに変更</strong>: 動的ルートセグメントで同期的な実装のまま出してしまい、本番で全リクエストが500エラーになるバグを実際に出しました。
            ドキュメントのバージョン履歴を読んで原因を特定し、修正・本番復旧を確認しています。
          </li>
          <li>
            <strong>エラーバウンダリのprops変更</strong>: 従来の reset ではなく unstable_retry を受け取る仕様変更を、実装前にドキュメントで確認して事前に回避できたケースです。
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Smartphone,
    title: "iOS PWA対応で踏んだハマりどころ",
    tone: "incident",
    body: (
      <ul className="list-disc list-inside space-y-1.5">
        <li>
          <strong>黒背景バグ</strong>: viewportにviewport-fit: coverを設定していなかったためiOSのセーフエリアが解決されず、
          かつ当時はダークモードのCSSがハーフウェイな状態（背景だけ暗転しコンポーネントは全部ライト固定）だったため、セーフエリア外がほぼ黒く表示される不具合がありました。
          一度はダークモード自体を削除して解決しましたが、後日クラス駆動（.darkクラスがある時だけ全コンポーネントが揃って切り替わる）の設計に作り直し、この画面右上のボタンから切り替えられます。
        </li>
        <li>
          <strong>セッションCookieが本番で効かない</strong>: next startはNODE_ENV=productionを設定するため、CookieのSecureフラグをNODE_ENVから判定するとHTTP環境で常にCookieが落ちていました。
          実際のリクエストプロトコルヘッダーから判定するよう修正しています。
        </li>
        <li>
          <strong>左右スワイプと横スクロールUIの衝突</strong>: タブ切り替え用の左右スワイプが、日付チップ列などの横スクロールUIの操作と衝突していました。
          最終的にスワイプでのタブ切り替え自体を廃止し、横スクロールのバウンスが画面全体に伝播しないようCSSを調整して解決しています。
        </li>
      </ul>
    ),
  },
  {
    icon: Sparkles,
    title: "二番煎じにしないための機能設計",
    tone: "default",
    body: (
      <>
        <p className="mb-2">
          単なる「記事まとめ＋AI要約」アプリで終わらせないために、他のニュースアプリ・学習アプリと役割が被らない機能を優先して実装しています。
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>技術論争サマライザー</strong>: 記事単体の要約ではなく、Hacker Newsのコメント欄の実際の温度感（賛成派/懸念派）をAIが構造化。
          </li>
          <li>
            <strong>リポジトリチェック</strong>: 一般的な「破壊的変更ニュース」の一覧ではなく、指定した公開リポジトリの実際の依存関係とキーワード照合し「自分に関係あるものだけ」を返す、Gemini APIを一切呼ばない決定的な仕組み。
          </li>
          <li>
            <strong>音声ポッドキャスト</strong>: 移動中でもキャッチアップできるよう、2人の掛け合い形式の音声をマルチスピーカーTTSで生成。
          </li>
          <li>
            <strong>AIエディタ設定エクスポート</strong>: 記事を読んで終わりにせず、Claude Code/Cursor向けの設定ファイルとして自分の開発環境に持ち込める。
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "品質保証: テスト・CI・セキュリティ・負荷テスト",
    tone: "default",
    body: (
      <ul className="list-disc list-inside space-y-1.5">
        <li>DB接続不要な純粋関数を中心にvitestで単体テスト。実際に見つけたバグは修正だけでなく再発防止テストとして残しています。</li>
        <li>push/PRごとに型チェック・Lint・テスト・ビルドを自動実行するCIを整備。</li>
        <li>
          依存関係の脆弱性監査で見つかった問題のうち大半を修正し、ツールの依存関係を壊すことが判明した残り2件は実際の攻撃可能性を検証した上でリスク受容と判断しています。
        </li>
        <li>本番障害を踏まえ、接続プールに負荷がかかる読み取り／キャッシュ経路に負荷テストを追加しています。</li>
      </ul>
    ),
  },
];

const TONE_CLASS: Record<Section["tone"], string> = {
  default: "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
  incident: "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40",
};

const ICON_TONE_CLASS: Record<Section["tone"], string> = {
  default: "text-indigo-600 dark:text-indigo-400",
  incident: "text-amber-600 dark:text-amber-400",
};

export default function AboutPage() {
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
          <h1 className="text-2xl font-bold brand-gradient-text leading-tight">この技術スタックについて</h1>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            開発の過程で行った技術的な意思決定とその理由をまとめたものです。コードを読まなくても「何を・なぜそう作ったか」が伝わるように書いています。
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Next.js 16 (App Router) / TypeScript / Prisma + PostgreSQL (Supabase) / Vercel / Gemini API
          </p>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} className={`rounded-xl border p-5 ${TONE_CLASS[s.tone]}`}>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1.5">
              <s.icon className={`w-4 h-4 shrink-0 ${ICON_TONE_CLASS[s.tone]}`} strokeWidth={2.25} />
              {s.title}
            </h2>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{s.body}</div>
          </section>
        ))}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
          より詳しい技術的な背景は{" "}
          <a
            href="https://github.com/kiro12102005/DevCurrent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            GitHubリポジトリ
          </a>{" "}
          のREADME・docs/DESIGN_DECISIONS.mdでも公開しています。
        </p>
      </div>
    </div>
  );
}
