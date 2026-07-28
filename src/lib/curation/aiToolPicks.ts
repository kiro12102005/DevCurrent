import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import { prisma } from "@/lib/prisma";

// Same free-tier-first model list reasoning as src/lib/gemini.ts - kept
// separate rather than shared so this batch job's model choice can drift
// independently from the interactive summarize path if needed.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
].filter((m): m is string => Boolean(m));

const PICK_SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "ツール・サービス・アプリの正式名称" },
          category: {
            type: "string",
            enum: ["AIサービス", "iOSアプリ", "PC機能", "開発支援ツール", "ブラウザ拡張"],
          },
          summary: { type: "string", description: "何ができるサービスか、2〜3文の日本語で具体的に" },
          recommendedFor: { type: "string", description: "どんな人・用途に向いているか、1〜2文" },
          useCaseExample: { type: "string", description: "具体的な使用例・活用シーンを1〜2文で" },
          sourceUrl: { type: "string", description: "公式サイトやドキュメントのURL（わかれば）" },
        },
        required: ["name", "category", "summary", "recommendedFor", "useCaseExample"],
      },
    },
  },
  required: ["picks"],
} as const;

interface CuratedPick {
  name: string;
  category: string;
  summary: string;
  recommendedFor: string;
  useCaseExample: string;
  sourceUrl?: string;
}

function resolveApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY未設定のため、AIツールピックアップの自動更新はスキップされました");
  }
  return apiKey;
}

async function curateWithGemini(): Promise<CuratedPick[]> {
  const client = new GoogleGenAI({ apiKey: resolveApiKey() });
  const config: GenerateContentConfig = {
    responseMimeType: "application/json",
    responseSchema: PICK_SCHEMA,
    temperature: 0.6,
  };

  const prompt = `あなたは最新のAIツール・生産性アプリに詳しい編集者です。
就活生・エンジニア未経験者〜若手エンジニアが知っておくと役立つ、今まさに話題になっている実在のAIサービス・iOSアプリ・PC機能・開発支援ツール・ブラウザ拡張を8個、重複なく厳選してください。

要件:
- 実在し、現在も利用可能なものに限る（架空のツール名を作らない）
- カテゴリが偏らないよう、AIサービス / iOSアプリ / PC機能 / 開発支援ツール / ブラウザ拡張 からバランスよく選ぶ
- 誰でも知っている超定番（ChatGPT本体など）だけでなく、まだ知名度が低いが有用なものも混ぜる
- summary・recommendedFor・useCaseExampleは抽象論ではなく具体的に書く
- sourceUrlはわかる範囲で公式サイトのURLを入れる（不明なら省略可）`;

  let lastError: unknown;
  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await client.models.generateContent({ model, contents: prompt, config });
      const text = response.text;
      if (!text) throw new Error("Geminiから応答がありませんでした");
      const parsed = JSON.parse(text) as { picks: CuratedPick[] };
      return parsed.picks;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const unavailable =
        message.includes('"code":404') ||
        message.includes("NOT_FOUND") ||
        message.includes("no longer available") ||
        message.includes('"code":429') ||
        message.includes("RESOURCE_EXHAUSTED");
      if (!unavailable) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Geminiモデルが利用できませんでした");
}

// Upserts curated picks by name so re-running this (e.g. weekly cron) refreshes
// descriptions in place instead of accumulating duplicates.
export async function refreshAiToolPicks(): Promise<{ count: number }> {
  const picks = await curateWithGemini();

  for (const pick of picks) {
    await prisma.aiToolPick.upsert({
      where: { name: pick.name },
      create: {
        name: pick.name,
        category: pick.category,
        summary: pick.summary,
        recommendedFor: pick.recommendedFor,
        useCaseExample: pick.useCaseExample,
        sourceUrl: pick.sourceUrl || null,
        publishedAt: new Date(),
      },
      update: {
        category: pick.category,
        summary: pick.summary,
        recommendedFor: pick.recommendedFor,
        useCaseExample: pick.useCaseExample,
        sourceUrl: pick.sourceUrl || null,
        publishedAt: new Date(),
      },
    });
  }

  return { count: picks.length };
}
