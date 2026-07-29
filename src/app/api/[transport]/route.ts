import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SourceType } from "@/generated/prisma";
import { ARTICLE_LIST_SELECT, toFeedArticle } from "@/lib/articleSelect";
import { getFeedPage } from "@/lib/feedQuery";
import { jstTodayString } from "@/lib/dateRange";

const SEARCH_PAGE_SIZE = 20;
const MIN_QUERY_LENGTH = 2;

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// Remote MCP server (Vercel's official mcp-handler, Streamable HTTP
// transport - see https://github.com/vercel/mcp-handler) exposing this
// app's already-public, already-free read data as tools for Claude Code /
// Claude Desktop / any MCP client. Deliberately read-only and limited to
// content that's already free/public via the equivalent REST routes
// (/api/feed, /api/search, /api/tools, /api/podcast/latest) - no
// Gemini-generation-triggering tools here, so this can't be used to run up
// the operator's API costs regardless of how many MCP clients call it.
const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_feed",
      {
        title: "技術トレンドフィードを取得",
        description:
          "Qiita/Zenn/Hacker News/ArXivから自動収集した技術記事フィードを取得します。日別または週間（直近7日間、JST基準）で注目ピックアップと通常記事一覧を返します。",
        inputSchema: {
          period: z.enum(["day", "week"]).optional().describe("day=指定日のみ, week=直近7日間（デフォルト）"),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD形式（JST）。未指定なら今日"),
          country: z.string().optional().describe("発信国で絞り込む（例: 'アメリカ'）。未指定なら全件"),
        },
      },
      async ({ period, date, country }) => {
        const result = await getFeedPage({
          period: period ?? "week",
          date: date ?? jstTodayString(),
          country,
        });
        return jsonResult(result);
      }
    );

    server.registerTool(
      "search_articles",
      {
        title: "記事をタイトル検索",
        description: "これまでにクロールした全期間の記事を、タイトルのキーワードで横断検索します。",
        inputSchema: {
          query: z.string().min(MIN_QUERY_LENGTH).describe("検索キーワード（2文字以上）"),
        },
      },
      async ({ query }) => {
        const where = {
          sourceType: { not: SourceType.USER_SUBMITTED },
          title: { contains: query, mode: "insensitive" as const },
        };
        const results = await prisma.article.findMany({
          where,
          orderBy: { sourcePublishedAt: "desc" },
          take: SEARCH_PAGE_SIZE,
          select: ARTICLE_LIST_SELECT,
        });
        return jsonResult({ query, results: results.map(toFeedArticle) });
      }
    );

    server.registerTool(
      "get_ai_tool_picks",
      {
        title: "話題のAIツール一覧を取得",
        description: "Geminiが選定した今話題のAIサービス・iOSアプリ・開発支援ツールなどのピックアップを取得します。",
        inputSchema: {},
      },
      async () => {
        const picks = await prisma.aiToolPick.findMany({
          orderBy: { publishedAt: "desc" },
          take: 20,
        });
        return jsonResult({ picks });
      }
    );

    server.registerTool(
      "get_latest_podcast",
      {
        title: "最新の音声ポッドキャストエピソードを取得",
        description: "その週の注目記事を2人のパーソナリティが解説する、最新の音声ポッドキャストエピソードの情報（台本・音声URL・取り上げた記事一覧）を取得します。",
        inputSchema: {},
      },
      async () => {
        const episode = await prisma.podcastEpisode.findFirst({ orderBy: { date: "desc" } });
        if (!episode) return jsonResult({ episode: null });
        let sourceArticles: unknown = [];
        try {
          sourceArticles = JSON.parse(episode.sourceArticles);
        } catch {
          // ignore parse failure, degrade to empty list
        }
        return jsonResult({ episode: { ...episode, sourceArticles } });
      }
    );
  },
  {},
  { basePath: "/api", maxDuration: 60 }
);

export { handler as GET, handler as POST };
