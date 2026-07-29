# 技術トレンド・スキルアップ統合アプリ

就活生・エンジニア未経験者向けに、技術記事URLを深掘りした「要約」「メリット・懸念点」「今後の展望」「用語解説」に変換するアプリ。PC(Web) / iOS(PWA) 両対応。

## できること

- **自動収集フィード**: Qiita / Zenn / Hacker News / ArXiv から過去1週間分の記事を自動クロール。**日別／週間まとめの切り替え**ができ、注目ピックアップ（エンゲージメント上位）はその期間内で動的に再計算されるので、今日だけでなく数日前の重要記事も見逃さない。記事カードは2列グリッド表示（スマホでは自動的に1列）、スクロールで追加読み込み。
- **月間ランキング**: フィード上部の「月間ランキング」チップで、直近30日間の記事をエンゲージメント順に1位から並べたランキング表示に切り替えられる。日別/週間の「注目ピックアップ」がソース別に均等配分されるのに対し、こちらはソースを問わず純粋なエンゲージメント順（`lib/monthlyRanking.ts`）。
- **発信国の表示・国フィルター**: 記事ごとに発信元と思われる国を🇯🇵🇺🇸🇨🇳のような国旗バッジで表示（Qiita/Zennは日本固定・即時、Hacker News/ArXivはGeminiが記事内容から推定）。フィード上部の国チップから実際にDBへ存在する国だけを動的に絞り込み表示できる（ハードコードされた国リストではないので、対応国が増えれば自動的に選択肢に出る）。
- **通常記事一覧のソース均等化**: Qiita/Zenn（日本語専門プラットフォーム）はHacker News/ArXivよりクロール量が多く、時系列の単純結合だとページの大半が日本語記事で埋まってしまう問題があった。ソースごとに個別取得した候補プールをラウンドロビンで交互配置することで、スクロールしても常にソースが均等に混ざって表示されるようにしている（`注目ピックアップ`セクションは元々ソース別に均等配分済み）。
- **注目ピックアップの自動要約**: 注目に選ばれた記事は、サーバー側で自動的に深掘り要約まで生成済みの状態でフィードに並ぶ（要`GEMINI_API_KEY`設定、下記参照）。
- **プッシュ通知**: 新しい注目記事が見つかると、購読しているブラウザ/スマホにWeb Push通知が届く。
- **URL入力での要約**: 好きな記事URLを貼る → DBキャッシュ確認 → (未キャッシュなら) スクレイピング → Gemini 2.5 Flash で「要約・メリット・懸念点・今後の展望・用語解説」をボリューム多めに生成。同じURLへの2回目以降のリクエストはキャッシュから即返却。
- **BYOK（Bring Your Own Key）**: 各ユーザーが画面右上の「APIキー設定」から自分のGemini APIキーを登録して使う設計。キーはブラウザの`localStorage`にのみ保存され、リクエストごとに`x-gemini-api-key`ヘッダーでサーバーへ渡すだけでDBには一切保存しない。他人にアプリを公開しても、ユーザーが持ち込んだURLの要約コストは各利用者自身のGemini無料枠に紐づく。
- **ログイン**: 右上からメール+パスワードで登録・ログイン（外部サービス不要の自前実装）。未ログインでもフィード閲覧・URL要約・AIツール一覧は利用可能。
- **AIツールピックアップ**: 「AIツール」タブで、Geminiが選定した今話題のAIサービス・iOSアプリ・開発支援ツールなどをカテゴリ別に閲覧できる（無限スクロールで追加読み込み）。
- **オフライン対応**: 直近に開いたページはキャッシュから表示可能。未キャッシュのページに完全オフラインでアクセスした場合も専用のオフライン画面を表示（エラー画面にならない）。
- PWA設定済み（`manifest.json` / apple-touch-icon / next-pwa による service worker、iOSの「ホーム画面に追加」に対応）
- 4タブ構成（フィード / URLで要約 / AIツール / マイページ）。モバイルは下部ナビのみ（上部タブは表示しない）、タブ切り替えはタップのみ（左右スワイプでの切り替えは、フィード内の日付チップ列などの横スクロールUIと誤反応するため廃止）。**マイページ**は保存済み・学習マップ・模擬面接・リポジトリチェック・共有ページ・フィードバックの6セクションをまとめたハブタブ（機能が増えてもトップレベルのタブ数を増やさない設計）
- **記事検索**: フィード画面上部の検索ボックスで、期間に関係なく全記事のタイトルを横断検索できる（Postgresの`ILIKE`検索）。
- **既読管理・ブックマーク・保存済み**: ログイン中は記事カード・AIツールカードから既読/ブックマークを切り替え可能（タップしやすい大きめのボタン）。「未読のみ」「ブックマークのみ」で絞り込み表示もできる。ブックマークとメモ機能は「マイページ＞保存済み」に統合済み（メモを書くと自動的にブックマークもされる）。
- **興味タグ・パーソナライズ通知**: アカウントメニューから興味のあるタグ（AI・機械学習、フロントエンドなど）や自由入力の技術キーワード（例: React, PyTorch）を登録すると、注目ピックアップのプッシュ通知がそれらに関連する記事だけに絞られる（記事のタグは`src/lib/tags.ts`のキーワード一致で無料判定・キーワードはタイトルとの部分一致・どちらも未設定なら従来通り全件通知）。
- **通知チャンネルの個別ON/OFF**: 「注目ピックアップ通知」と「🚨破壊的変更アラート」を別々にON/OFFできる（アカウントメニュー＞通知の種類）。破壊的変更アラートは興味タグ・技術スタックの設定に関わらず独立して届く高シグナルなチャンネルという扱い（両方マッチしても二重通知はしない・1バッチにつき最大1通）。
- **週次ダイジェストメール**: アカウントメニューでオプトインすると、その週の注目記事まとめがResend経由でメール配信される（要`RESEND_API_KEY`、下記参照）。
- **MD/PDF出力**: URL要約結果・保存済み一覧・ハンズオンコードをそれぞれMarkdownファイルとしてダウンロード可能。PDFはサーバー側でヘッドレスブラウザを起動する重い方式を避け、印刷用スタイル（`print:`）＋ブラウザの「印刷→PDF保存」で対応。
- **模擬面接AI**: マイページ＞模擬面接。保存済みの記事・メモをもとに、Geminiが技術面接で聞かれそうな質問と回答のポイントを生成（BYOK）。丸暗記ではなく自分の言葉で考えさせるフラッシュカード形式。
- **学習マップ**: マイページ＞学習マップ。既読/保存記事数・直近30日の活動日数・分野別（AI・機械学習、フロントエンドなど）のキャッチアップ状況を可視化。
- **共有可能な学習実績ページ**: マイページ＞共有ページでオプトインすると、`/u/[ランダムなスラッグ]`に公開プロフィール（学習マップ・活動統計、メールアドレス等は非表示）が作成される。就活サイトや履歴書に貼れるリンクとして利用可能。
- **GitHubの一次情報表示**: URL要約結果が特定のGitHubリポジトリを扱っている場合、GitHub公開APIから実際のスター数・最終コミット日・最新リリースを取得して表示（記事の煽り文句ではなく実データで確認できる。要リポジトリ検出、`GITHUB_TOKEN`設定でレート制限緩和・任意）。
- **3分ハンズオン**: URL要約結果から、Geminiがその技術を試せる最小構成コードを生成（BYOK）。ブラウザだけで完結する内容ならCodeSandboxの「define API」で自動的にオンラインエディタを作成し、その場で実行可能。ローカル環境が必要な場合はコードと実行手順を表示。
- **音声ポッドキャスト（通勤・通学モード）**: フィード上部に1日1本、その週の注目記事をGeminiのマルチスピーカーTTSが2人の掛け合い形式で読み上げる音声プレイヤーを表示。手や目を離せない移動中でもキャッチアップできる。運営者キーで1日1回だけ生成・Vercel Blobに保存する共有コンテンツ（`AiToolPick`と同じコスト方針）で、同じ日に複数回リクエストされても再生成しない。台本は文字起こしとしても閲覧可能。プレイヤーには取り上げた記事の出典・タイトル・概要も常に表示（音声を聞き逃しても内容を追える）。台本は各記事の出典・タイトルを明示してから内容に入る構成にし、TTSにも「通勤中に聞き取りやすいよう、ゆっくり・明瞭に」という指示を渡している（音声のみに情報を頼らせない設計）。MediaSession APIに対応しており、ホーム画面に追加したPWAならロック画面・コントロールセンターから再生/一時停止/10秒スキップを操作できる（ネイティブアプリ化しなくても使える標準Web API）。聞き終わったら「しまう」ボタンでコンパクト表示に折りたためる（`localStorage`にエピソード日付を記録し、翌日の新しいエピソードでは自動的に展開表示に戻る）。
- **記事の共有**: フィード記事カード・URL要約結果にWeb Share APIによる共有ボタンを設置。対応ブラウザ（iOS/Android）ではOSネイティブの共有シートが開く（LINE/X/メールなど）。非対応環境（主にデスクトップブラウザ）ではボタン自体を表示しない設計。
- **AIエディタ設定エクスポート**: URL要約結果から、その記事のテーマに沿ったClaude Code用`CLAUDE.md`・Cursor用ルールファイル・汎用システムプロンプトの3種類をGeminiが生成（BYOK）。コピー・ファイル保存にワンタップ対応、自分の開発環境にそのまま持ち込める。
- **リポジトリチェック**: マイページ＞リポジトリチェック。公開GitHubリポジトリ（npmプロジェクト）のURLを入力すると、`package.json`の依存関係を解析し、このアプリがすでに検知した破壊的変更ニュースの中から実際に使っているライブラリに関係するものだけをピンポイントで警告。Geminiを呼ばない決定的なキーワード照合のため何度でも無料で実行可能。
- **技術論争サマライザー**: Hacker News発の注目記事について、コメント欄の意見をGeminiが「導入推奨派」「懸念派」に分類して要約表示（クロール時点で自動生成する共有コンテンツ、コメント数が少ない記事ではスキップ）。記事単体の要約だけでなく、コミュニティの実際の温度感まで一目で把握できる。
- **フィードバック**: マイページ＞フィードバック。バグ報告・改善提案・その他を送信できる簡易フォーム（ログイン不要）。DBに保存されるほか、`FEEDBACK_NOTIFY_EMAIL`設定時は運営者に通知メールも届く（外部サービス不要、既存のResend連携を再利用）。App Store等の公開レーティングに結びつかない星評価は意味が薄いため実装していない。

## セットアップ

```bash
pnpm install
cp .env.example .env
pnpm db:push   # SQLite DB (prisma/dev.db) を作成
pnpm dev        # http://localhost:3000
```

`.env`で設定するもの:

| 変数 | 必須 | 用途 |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite接続文字列（デフォルトのままでOK） |
| `GEMINI_API_KEY` | 任意 | **自動フィードの「注目ピックアップ」を自動要約するためのサーバー側キー。** 未設定でもアプリは動くが、注目記事の自動要約とプッシュ通知の中身が空になる。運営者自身のキーを設定する（無料枠で十分まわる想定・下記コスト設計参照）。ユーザーが手動でURLを貼って要約する機能は各自のBYOKキーを使うため、この変数とは無関係。 |
| `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push通知を使うなら✅ | `npx web-push generate-vapid-keys`で生成。`.env`には開発用のペアが同梱済み。 |
| `CRON_SECRET` | 任意 | `GET /api/feed/refresh`・`GET /api/tools/refresh`（Vercel Cron専用）の認証。`POST`（アプリ内の更新ボタン・GitHub Actionsが使用）は誰でも呼べる設計のため対象外。未設定でも動作する。 |
| `ENABLE_AUTO_FEED_CRON` / `FEED_REFRESH_INTERVAL_HOURS` | 任意 | サーバー内蔵の自動更新タイマー（下記参照）のON/OFFと間隔（時間）。デフォルトON・3時間おき。 |
| `RESEND_API_KEY` / `RESEND_FROM` | 任意 | 週次ダイジェストメール送信用（[resend.com](https://resend.com)で取得、`re_`から始まる）。未設定でも他の機能はすべて動作し、ダイジェスト送信だけスキップされる。`RESEND_FROM`は検証済みドメインのアドレス、テスト用途なら`onboarding@resend.dev`のままでも送信可（到達率は低い）。 |
| `FEEDBACK_NOTIFY_EMAIL` | 任意 | マイページ＞フィードバックからの送信を運営者に通知するメール送信先。`RESEND_API_KEY`も設定されている場合のみ送信、未設定でも投稿自体はDBに保存され続ける（`Feedback`テーブル）。 |
| `GITHUB_TOKEN` | 任意 | GitHub一次情報表示のレート制限緩和用（読み取り専用PATで可）。未設定でも動作するが、GitHub公開APIの無認証レート制限（60回/時/IP）にかかりやすくなる。 |
| `BLOB_READ_WRITE_TOKEN` | ポッドキャストを使うなら✅ | Vercel Blobへの音声アップロード用トークン。`vercel blob create-store <name> --access public`で作成すると自動的に環境変数へ注入される。未設定でも他機能に影響なし（ポッドキャスト生成だけスキップ）。 |

> Next.js 16 はデフォルトで Turbopack ですが、`next-pwa` が webpack プラグインのため
> `dev` / `build` は `--webpack` フラグ付きで実行しています（`package.json` 参照）。

## テスト・CI

```bash
pnpm test          # vitest run（一度きり）
pnpm test:watch    # 変更監視
pnpm test:coverage # カバレッジ付き
```

DB接続・外部APIキーが不要な純粋関数（URL正規化・タグ判定・WAV変換・JST日付計算・
`package.json`依存関係の照合・HTMLエンティティのデコードなど）をvitestで単体テストしている。
中には実際に見つけたバグの再発防止テストも含む（`repoCheck.test.ts`の`@eslint/js`→`"js"`誤マッチ、
`hnComments.test.ts`の`&#x27;`未デコード、どちらも本番投入前のライブ検証で発見・修正したもの）。

`.github/workflows/ci.yml`が`push`/`pull_request`のたびに型チェック・Lint・テスト・ビルドを自動実行する
（`.github/workflows/cron-refresh.yml`とは別ワークフロー・目的が異なる）。シークレット不要で動く設計:
`prisma.config.ts`が`DATABASE_URL`未設定時にSQLiteへフォールバックし、全APIルートが動的レンダリング
（ビルド時に実DBへ接続しない）のため。

## セキュリティ

- **依存関係の脆弱性監査**: `pnpm audit`で発見された8件のうち6件（PostCSS 3件・serialize-javascript 2件
  ・sharp 1件、いずれも`next`/`next-pwa`の推移的依存）を`package.json`の`pnpm.overrides`でパッチ済みバージョンに固定して解消。
  残り2件（`brace-expansion`、`next-pwa`のビルド時ツールチェーン経由）は意図的に未修正: 一律に上書きすると
  ESLintが依存する`minimatch@3.1.5`と同一インスタンスを共有しており、実際に`eslint`が壊れることをローカルで確認した
  （`TypeError: expand is not a function`）。この脆弱性はビルド時のみ・信頼済みの設定ファイルしか処理しないため
  実際に攻撃者が到達できる経路がなく、ツールを壊してまで修正する価値がないと判断（リスク受容）。
- **Dependabot**: `.github/dependabot.yml`でnpm依存関係とGitHub Actionsを毎週自動チェック。
- **入力バリデーション**: `/api/feed`の`date`パラメータに形式チェックを追加（不正な値がPrismaまで届いて500になっていたのを400に）、
  `/api/article-states`の`articleIds`に上限（200件）を追加、`/api/log-client-error`（未認証で誰でも叩ける設計上必須）に
  zodでのフィールド長上限を追加し、ログ荒らしによるVercelログ容量の浪費を防止。
- **レート制限（未公開・要ユーザー操作）**: Vercel Firewallにログのみのレート制限ルールをステージング済みだが、
  本番反映には`vercel firewall publish --yes`をユーザー自身が実行する必要がある（[vercel-firewallスキルのベストプラクティス](https://vercel.com/docs/vercel-firewall)に従い、影響範囲の大きい変更を自動実行しない設計）。

## 自動収集の仕組み

「自分から探しに行かないと情報にたどり着けない」問題への対策として、フィードは完全自動で更新されます。

1. **`src/lib/crawlers/{qiita,zenn,hackernews,arxiv}.ts`** — 各ソースの公開APIを叩いて記事のタイトル・URL・エンゲージメント数（いいね/ストック/ポイント）を取得。認証不要。**過去7日分を明示的に範囲指定して取得**（「最新N件」だけだと更新頻度の高いサイトで数時間分しか拾えず取りこぼすため、日付範囲・ページネーションで1週間分をカバー）。
2. **`src/lib/crawlers/refresh.ts`** — 4ソースを並列クロール → 既存記事と重複排除 → 英語タイトルを一括で日本語化（新規分＋既存の未翻訳分を毎回少しずつバックフィル）→ 半年（`RETENTION_DAYS=180`）を超えた未要約・非注目の古い記事を削除（ストレージ節約） → クロール時点でソースごとにエンゲージメント上位2件（最大6件/回）を「速報の注目ピックアップ」として即時スクレイピング＋Gemini生成（`GEMINI_API_KEY`使用）→ 新しい注目記事があればプッシュ通知を送信。
3. **`src/instrumentation.ts`** — Next.jsのサーバー起動フックを使い、長時間稼働するプロセス（このdevcontainerや自前ホスティング）なら**起動後15秒＋以降`FEED_REFRESH_INTERVAL_HOURS`時間ごとに自動でクロール**が走る。追加設定不要。
4. **`POST /api/feed/refresh`** — 上記処理をHTTP経由でも呼べるエンドポイント（`x-cron-secret`ヘッダーで保護可）。Vercelなどサーバーレス環境では`setInterval`が使えないため、**Vercel Cron**や**GitHub Actionsの`schedule`**からこのエンドポイントを叩く形で自動化する。
5. **`GET /api/feed?period=day|week&date=YYYY-MM-DD`** — フィード表示用API。`period=day`は指定日、`period=week`は指定日を含む直近7日間（JST基準）に絞り込む。**「注目ピックアップ」はDBの固定フラグではなく、選択中の期間内でエンゲージメント上位を都度計算し直す**ので、「今日」を見ても「先週」を見ても、その期間で本当に重要だった記事が出てくる（3.のクロール時点の即時ピックアップとは独立した、閲覧時の動的な再ランキング）。

**保存ポリシー（ストレージ管理）**: データは基本的に削除しない。ただし「一度もGemini要約されておらず、注目ピックアップにも一度も選ばれていない」記事は半年経過後に自動削除する（`cleanupOldArticles`、毎リフレッシュサイクルで実行）。要約済み記事・注目ピックアップ・ユーザーが自分で貼ったURLは対象外で無期限保存。

**なぜ自動要約は「運営者のAPIキー」を使うのか**: 注目ピックアップの自動要約は不特定多数のユーザーが見る「共有コンテンツ」であり、1回生成すればキャッシュされ全員が使い回せる（1日数十件程度、Gemini 2.5 Flash無料枠で十分収まる想定）。一方、ユーザーが自分で持ち込んだURLの要約はBYOK（各自のキー）— 「共有コンテンツの生成」と「個人利用の生成」でコスト負担者を明確に分けている設計です。

## Web Push通知

画面右上の「🔔 通知」ボタンで購読すると、`PushSubscription`テーブルに購読情報が保存され、注目ピックアップが見つかるたびに全購読者へ通知が飛びます（現状は全員一斉配信。Week3の認証実装後にユーザー単位の配信に拡張予定）。

- Service Workerのpushイベント処理は`worker/index.js`に実装し、next-pwaの`customWorkerSrc`機能で生成済みのsw.jsに自動的に組み込まれる。
- **プッシュ通知はプロダクションビルドでのみ動作**（開発時はnext-pwaのService Worker自体を無効化しているため）。試す場合は `pnpm build && pnpm start` で起動してください。

## 使用技術

Next.js 16 (App Router) / TypeScript / React 19 / Tailwind CSS v4 / Prisma ORM (SQLite → PostgreSQL) /
Google Gemini API (`@google/genai`) / Web Push (`web-push`) / bcryptjs + jose（自前認証） / next-pwa /
lucide-react（アプリ内アイコン・アプリアイコン共通のストロークベースのアイコン言語で統一） /
mcp-handler + @modelcontextprotocol/sdk（Claude向けMCPサーバー）

## ディレクトリ構成

```
src/
  app/
    page.tsx                     # AppShellを描画するだけの薄いエントリ
    layout.tsx                   # PWA/iOSメタタグ、フォント
    offline/page.tsx             # オフライン時のフォールバックページ（next-pwa）
    api/
      summarize/route.ts         # POST: URL手動入力 -> キャッシュ確認 -> スクレイピング -> Gemini生成(BYOK) -> 保存
      feed/route.ts              # GET: フィード記事一覧
      feed/refresh/route.ts      # POST: クロール実行トリガー（cron/手動共通）
      push/subscribe/route.ts    # POST: Push購読を保存
      push/unsubscribe/route.ts  # POST: Push購読を解除
      auth/{signup,login,logout,me}/route.ts  # 自前認証（bcryptjs + jose JWTセッションCookie、外部サービス不要）
      notes/route.ts, notes/[id]/route.ts      # ユーザーメモCRUD（作成時に自動でブックマークも付与）
      tools/route.ts, tools/refresh/route.ts, tools/[toolId]/bookmark/route.ts  # AIツールピックアップ一覧（ページネーション）・Geminiキュレーションバッチ・ブックマーク
      article-states/route.ts, article-states/[articleId]/route.ts  # 記事の既読/ブックマーク状態
      saved/route.ts               # GET: 「保存済み」タブ用（ブックマーク記事＋メモを統合）
      search/route.ts              # GET: 全期間横断のタイトル検索
      user/preferences/route.ts    # GET/PUT: 興味タグ・週次ダイジェストのオプトイン
      user/share/route.ts          # GET/PUT: 学習実績ページの公開オプトイン・表示名
      digest/send/route.ts         # GET: 週次ダイジェストメール送信トリガー（CRON_SECRET必須）
      interview/generate/route.ts  # POST: 保存済み記事から模擬面接の質問生成（BYOK）
      learning-map/route.ts        # GET: 分野別キャッチアップ状況の集計
      podcast/generate/route.ts    # GET: 当日分のポッドキャスト生成トリガー（CRON_SECRET必須）
      podcast/latest/route.ts      # GET: 最新エピソード取得（認証不要）
      editor-config/generate/route.ts  # POST: AIエディタ設定（CLAUDE.md/Cursorルール/汎用プロンプト）生成（BYOK）
      repo-check/route.ts          # POST: 公開リポジトリの依存関係と破壊的変更ニュースの照合（Gemini不使用・無料）
      feedback/route.ts            # POST: フィードバック送信（ログイン不要・DB保存＋運営者通知メール）
      feed/countries/route.ts      # GET: フィードの国フィルター用に実在する国一覧を返す
      [transport]/route.ts         # GET/POST: MCPサーバー（Claude向け、mcp-handler使用）
    u/[slug]/page.tsx             # 公開共有ページ（認証不要、shareSlugでUserを引く）
  components/
    AppShell.tsx                 # ヘッダー・4タブ切り替えを統括するクライアントコンポーネント（モバイルは下部ナビのみ）
    FeedList.tsx                  # 自動収集フィード表示（注目ピックアップ＋最新記事一覧＋検索＋既読/ブックマークフィルター）
    UrlSummarizer.tsx              # URL手動入力フォーム＋結果カード（フィードからの選択も受け付ける）
    GlossaryTerm.tsx                # タップ/ホバーで用語解説を表示
    ApiKeySettings.tsx               # BYOK: 自分のGemini APIキー登録パネル
    NotificationSubscribe.tsx         # Push通知の購読/解除ボタン
    AuthMenu.tsx                      # ログイン/新規登録パネル・アカウントメニュー（興味タグ・ダイジェストオプトイン含む）
    ArticleNotes.tsx                   # 記事詳細内のメモ追加・ブックマーク切り替え
    MyPage.tsx                          # 「マイページ」タブ（保存済み/学習マップ/模擬面接/共有ページの内部サブナビ）
    SavedList.tsx                       # 保存済み記事＋メモの統合ビュー（MD/PDF出力ボタン付き）
    LearningMap.tsx                      # 分野別キャッチアップ状況の可視化
    InterviewPractice.tsx                 # 模擬面接AI（フラッシュカード形式）
    SharePageSettings.tsx                  # 学習実績ページの公開設定
    AiToolPicks.tsx                      # 「AIツール」タブ（ページネーション・ブックマーク対応）
    PodcastPlayer.tsx                     # 「今日のポッドキャスト」プレイヤー（フィード上部・台本表示切替）
    EditorConfigGenerator.tsx              # AIエディタ設定エクスポート（URL要約結果内）
    RepoBreakingChangeCheck.tsx             # リポジトリチェック（マイページ内）
    FeedbackForm.tsx                          # フィードバック送信フォーム（マイページ内）
  lib/
    prisma.ts                    # PrismaClientシングルトン
    gemini.ts                    # Gemini 2.5 Flash 呼び出し（BYOK対応・構造化JSON出力、模擬面接質問生成も含む）
    learningStats.ts              # 学習マップ集計ロジック（/api/learning-mapと公開共有ページで共有）
    exportMarkdown.ts             # 記事要約・保存済み一覧のMarkdown変換
    download.ts                   # クライアント側でのファイルダウンロードヘルパー
    summarize.ts                  # スクレイピング+生成+DB保存の共有ロジック（手動要約とフィード自動要約の両方が使う）
    scrape.ts                     # cheerioによる記事本文抽出
    hash.ts                       # URL正規化 & sha256（キャッシュキー生成）
    push.ts                       # web-pushでの通知送信（sendPersonalizedPushで興味タグによる絞り込み）
    pushClient.ts                  # ブラウザ側のPush購読ヘルパー
    apiKeyStorage.ts                # localStorageでのBYOKキー管理（useSyncExternalStore）
    cronAuth.ts                      # スケジューラ認証共通ロジック（x-cron-secret / Vercel CronのBearerヘッダー両対応）
    tags.ts                          # 固定タグ一覧＋タイトルからのキーワード判定（無料・Gemini不使用）
    email.ts                         # Resend経由の週次ダイジェスト送信
    weeklyPicks.ts                    # 週次注目ピックアップの取得（週次ダイジェストとポッドキャスト台本生成が共有）
    podcast.ts                        # ポッドキャスト生成オーケストレーション（台本生成→TTS→WAV変換→Blobアップロード→DB保存、当日分は再生成しない）
    wav.ts                            # Gemini TTSが返す生PCMをWAVファイル形式に変換
    github.ts                          # GitHub公開APIの共通fetchヘルパー（github-stats・repo-checkで共有）
    repoCheck.ts                       # package.jsonの依存関係抽出とisBreakingChange記事とのキーワード照合
    hnComments.ts                      # Hacker Newsのコメントスレッド取得（Algolia検索API、技術論争サマライザー用）
    articleSelect.ts                 # /api/feedと/api/searchで共有するArticleのPrisma select/整形
    feedQuery.ts                      # フィード取得ロジック本体（/api/feedとMCPサーバーのget_feedツールで共有）
    auth/{session,password,AuthContext}.ts,tsx  # セッション発行/検証・パスワードハッシュ・クライアント側認証状態
    curation/aiToolPicks.ts       # Gemini駆動のAIツールピックアップ生成バッチ
    crawlers/
      qiita.ts / zenn.ts / hackernews.ts / arxiv.ts   # ソース別クローラ
      refresh.ts                  # 4ソース統合クロール＋注目選定＋自動要約＋通知のオーケストレーション
      types.ts
  types/                         # フロント/API共通の型
  instrumentation.ts             # サーバー起動時に自動クロールタイマーを起動
  generated/prisma/              # Prisma Client 生成物（gitignore対象）
prisma/
  schema.prisma                  # DBスキーマ（下記参照）
  postgresql-migrations/         # 本番(Postgres)用の初期マイグレーション（DEPLOY.md参照）
worker/
  index.js                       # カスタムService Worker（push / notificationclick処理）。next-pwaがsw.jsに自動組み込み
public/
  manifest.json, icon-*.png, apple-touch-icon.png
```

## DBスキーマ設計（`prisma/schema.prisma`）

キャッシュ層が本アプリの心臓部（Gemini無料枠を守るため）:

- **Article**: 記事URLごとに1レコード。`urlHash`（正規化URLのsha256）をユニークキーにして、同じ記事への重複リクエストを検出。`contentHash`でスクレイピング内容の変化も検知できるようにしてある。`sourceType`（Qiita/Zenn/HackerNews/ArXiv/投稿URL）、`country`（発信国、Qiita/Zennは即時「日本」・他はGemini推定）、`engagementScore`・`isFeatured`（自動クロール時のエンゲージメントと注目フラグ）、`sourcePublishedAt`（フィード表示のソート用）を保持。
- **AIGeneration**: `Article`と1:1。Geminiが生成した深掘り要約・メリデメ・今後の展望・用語解説をJSON文字列で保存。**ここに存在すれば、Gemini APIは二度と呼ばない。**
- **User**: `email` + `passwordHash`（bcryptjs）。外部サービス不要の自前認証。意図的にGemini APIキーのカラムは持たせていない（BYOKキーはクライアント側のみで保持する設計のため）。
- **UserNote**: ユーザーが記事に残す自由記述メモ（面接対策の一言・気づきなど）。ログインユーザーのみ作成・編集・削除可能。
- **PushSubscription**: Web Push購読情報（endpoint / p256dh / auth）。ログイン中に購読するとそのデバイスに`userId`が紐づく（未ログインでも匿名購読は引き続き可能・全員へブロードキャストの挙動自体は変わらない）。
- **AiToolPick**: 「最新AIツール・便利アプリ」ピックアップのキュレーションデータ。`name`をユニークキーにして、`POST /api/tools/refresh`（Gemini駆動、運営者の`GEMINI_API_KEY`を使用）を再実行しても重複せずupsertされる。
- **PodcastEpisode**: 1日1本のポッドキャストエピソード。`date`（JST・YYYY-MM-DD）をユニークキーにして、同日に何度リクエストされても再生成しない（Gemini TTSは相対的にコストが高いため）。音声本体はVercel Blobに保存し、`audioUrl`のみDBに持つ。
- **Feedback**: バグ報告・評価・改善提案の送信履歴。`userId`/`email`はどちらも任意（未ログインでも送信可能な設計のため）。

ローカルMVPはSQLiteで開発し、本番はPostgreSQL（Supabase想定）に切り替える設計。切り替え手順は[DEPLOY.md](./DEPLOY.md)を参照（オフラインで生成済みの初期マイグレーションSQLを`prisma/postgresql-migrations/`に同梱済み）。

## 認証について

Supabase Authなどの外部サービスは使わず、bcryptjsによるパスワードハッシュ化と、joseで署名したJWTをhttpOnly Cookie（`session`）に格納する自前実装。ログインは記事へのメモ保存とプッシュ通知のアカウント紐付けにのみ必要で、フィード閲覧・URL要約・AIツール一覧の閲覧はログインなしで利用できる。

## 定期実行（本番）

`instrumentation.ts`のインプロセスタイマーはVercelのようなサーバーレス環境では動かないため、本番では`vercel.json`（週次のAIツールピックアップ更新・週次ダイジェスト送信）と`.github/workflows/cron-refresh.yml`（3時間おきのフィード更新・週次のAIツールピックアップ更新・毎日6時JSTのポッドキャスト生成）を使う。詳細は[DEPLOY.md](./DEPLOY.md)を参照。

## AI連携（Claude / ChatGPT / Gemini）

フィード・AIツールピックアップ・ポッドキャストは、すべて認証不要・無料で外部のAIアシスタントから参照できる。
生成をトリガーするツールは意図的に含めていない（誰でも呼べる公開エンドポイントなので、Gemini生成コストが青天井にならないよう既にキャッシュ済み・公開済みのデータの読み取りだけに限定）。

- **Claude Code / Claude Desktop（MCP）**: [Vercel公式のmcp-handler](https://github.com/vercel/mcp-handler)（Streamable HTTP transport）で`/api/mcp`にMCPサーバーを実装済み。`get_feed`・`search_articles`・`get_ai_tool_picks`・`get_latest_podcast`の4ツールを提供。
  ```bash
  claude mcp add --transport http tech-trend-catchup https://dev-current.vercel.app/api/mcp
  ```
  Claude Desktop / claude.aiでも「設定＞コネクタ」から同じURLを追加すれば利用可能（バージョンにより`mcp-remote`経由になる場合あり）。
- **ChatGPT（カスタムGPT）**: `https://dev-current.vercel.app/openapi.json` をカスタムGPTの「Actions」にそのまま登録すれば、同じ4種類のデータをGETリクエストとして呼び出せる。
- **Gemini**: 現時点でサードパーティが簡単に登録できる拡張機能の仕組みが無いため、上記OpenAPI仕様書を参照する形での手動連携、またはGemini APIのFunction Callingを使った自作クライアントでの利用を想定（Claude/ChatGPTほど手軽な「URLを貼るだけ」の連携方法は無い）。

## 開発状況

- Week 1: コア生成パイプライン ✅
- Week 2: 自動リサーチ＆通知 ✅
- Week 3: ユーザー機能・認証・メモ ✅（自前認証・メモ機能・AIツールピックアップ・用語解説強化・ボトムナビ拡張）
- Week 4: 仕上げ・品質固め — コード面（Postgres移行ファイル・Vercel Cron/GitHub Actions設定・オフラインキャッシュ）は準備済み。実際のSupabase/Vercelアカウント作成・本番デプロイはユーザー自身の作業（[DEPLOY.md](./DEPLOY.md)参照）

技術的な意思決定の理由（コスト設計・本番障害の顛末・Next.js 16の破壊的変更への対応など）は
[docs/DESIGN_DECISIONS.md](./docs/DESIGN_DECISIONS.md)にまとめている。
