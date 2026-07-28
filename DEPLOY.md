# 本番デプロイ手順（Supabase + Vercel）

ローカルはSQLite（`prisma/schema.prisma`の`provider = "sqlite"`）のまま開発を続けられます。
このドキュメントは、実際に外部からアクセスできる本番環境を用意するときの手順です。
**Supabase・Vercelのアカウント作成やプロジェクト作成はユーザー自身が行う必要があります**（このリポジトリの中だけでは完結しません）。

## 0. 前提: Gitリポジトリ化

このディレクトリはまだGitリポジトリではありません。Vercelにデプロイするには、GitHub連携 or Vercel CLI直接デプロイのどちらかが必要です。

```bash
git init
git add .
git commit -m "Initial commit"
```

その後、GitHubに新規リポジトリを作成して push するか（GitHub連携デプロイの場合）、`vercel`コマンドで直接デプロイします（後述）。

## 1. Supabaseプロジェクトを作成

1. https://supabase.com でプロジェクトを新規作成（無料枠でOK）
2. `Project Settings > Database` から接続文字列を2種類取得:
   - **Connection pooling** 用URL（`DATABASE_URL`に使う。ポート`6543`、`pgbouncer=true`付き）
   - **Direct connection** 用URL（`DIRECT_URL`に使う。ポート`5432`。マイグレーション実行専用）

## 2. スキーマをPostgreSQL用に切り替え

`prisma/schema.prisma`の`datasource`ブロックを次のように変更します（SQLite用の記述から変更）:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 3. 初期マイグレーションを適用

このリポジトリには、現在のスキーマから生成済みのPostgreSQL用初期マイグレーションが
`prisma/postgresql-migrations/`に用意してあります（`prisma migrate diff --from-empty`で生成、
実際のDBに一度も接続せずに生成できるオフラインの差分なので、内容は現在のスキーマと必ず一致しています）。

```bash
# 1. Prismaが認識する場所にリネーム
mv prisma/postgresql-migrations prisma/migrations
mv prisma/migrations/0_init prisma/migrations/0_init  # フォルダ名はそのままでOK

# 2. .envにDATABASE_URL / DIRECT_URLを設定してから実行
npx prisma migrate deploy
npx prisma generate
```

以降、スキーマを変更したら通常通り `npx prisma migrate dev --name <変更内容>` でマイグレーションを追加していきます
（ローカルSQLite開発に戻る場合は`git stash`等でこの切り替えを退避してください）。

## 4. Vercelにデプロイ

```bash
npx vercel        # 初回: プロジェクトをリンク（GitHub連携なしでも直接デプロイ可能）
npx vercel --prod # 本番デプロイ
```

またはVercelダッシュボードからGitHubリポジトリをインポートしてください。

### 必要な環境変数（Vercelプロジェクトの Settings > Environment Variables）

| 変数 | 値 |
|---|---|
| `DATABASE_URL` | Supabaseのpooling接続文字列 |
| `DIRECT_URL` | Supabaseのdirect接続文字列 |
| `AUTH_SECRET` | 本番用に新規生成（`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`）。ローカル開発用の値を再利用しない |
| `GEMINI_API_KEY` | 運営者用キー（任意・featured picksの自動要約とAIツールピックアップに使用） |
| `GEMINI_MODEL` | 任意 |
| `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys`で本番用に新規生成 |
| `VAPID_SUBJECT` | `mailto:` + 実際の連絡先 |
| `CRON_SECRET` | 任意。Vercel Cron（GET）だけを保護する（下記参照）。設定しなくても動作する |
| `ENABLE_AUTO_FEED_CRON` | `"false"`にする（Vercelはサーバーレスなので`instrumentation.ts`のインプロセスタイマーは使えない。下記のスケジューラで代替） |

## 5. 定期実行（自動クロール・自動キュレーション）

`instrumentation.ts`のインプロセスタイマーはVercel（サーバーレス）では動作しません。代わりに:

- **`vercel.json`**（このリポジトリに含み済み）: `/api/tools/refresh`を毎週月曜0時に実行するVercel Cronを設定済み。
  Vercelは`CRON_SECRET`という名前の環境変数が設定されていれば、Cron実行時に自動で`Authorization: Bearer $CRON_SECRET`ヘッダーを付けてくれます。
  **Vercel Hobbyプランはcronの実行頻度が1日1回までの制限があるため**、3時間おきが必要な`/api/feed/refresh`はここに含めていません。
- **`.github/workflows/cron-refresh.yml`**（このリポジトリに含み済み）: `/api/feed/refresh`を3時間おき、`/api/tools/refresh`を毎週実行するGitHub Actionsワークフロー。
  GitHubリポジトリの `Settings > Secrets and variables > Actions` で以下を設定してください:
  - `APP_URL`: デプロイ先のURL（例: `https://your-app.vercel.app`）
  - `CRON_SECRET`: 設定するならVercelと同じ値（未設定でも動く。下記参照）

両方設定しても問題ありません（`/api/tools/refresh`はupsert、`/api/feed/refresh`はurlHashのunique制約で冪等なので、重複実行しても壊れません）。

**`CRON_SECRET`が実際に保護するのはGETだけ**: 両ルートとも `POST` は認証なしで受け付けます（アプリ内の「今すぐ更新」「更新する」ボタンがブラウザから直接この同じURLをPOSTで叩くため、サーバー専用シークレットを要求できません）。`GET`（Vercel Cronが自動送信するBearerヘッダー付きの呼び出し）だけ`CRON_SECRET`で保護されます。GitHub Actionsは`POST`を使うので、`CRON_SECRET`のヘッダーを付けていますが実際には未設定でも動作します。

## 6. デプロイ後の確認

- トップページが開けるか
- 新規登録・ログインができるか（`AUTH_SECRET`未設定だとエラーになります）
- `POST /api/feed/refresh`を手動で一度叩いて記事が入るか確認（`x-cron-secret`ヘッダー必須）
- プッシュ通知の購読・受信ができるか
