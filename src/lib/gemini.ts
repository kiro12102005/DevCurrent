import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

// Google rotates which models are available to new API keys surprisingly
// fast (gemini-1.5-flash, then gemini-2.5-flash, both stopped working for
// new users within the same month this app was built), AND the newest/most
// capable free-tier model can carry a tiny daily quota (gemini-3.6-flash:
// 20 requests/day free tier, observed via a live 429). "-lite" models
// consistently ship far more generous free quotas, so they're tried first -
// this app's whole design goal is free-tier stability, not max intelligence.
// Rather than hardcode one model, try this list in order and fall back to
// the next on a 404 ("no longer available") or 429 (quota exhausted - the
// free-tier quota is per-day, so retrying the same model won't help until
// tomorrow; a different model has its own separate quota bucket). Override
// the first choice via GEMINI_MODEL without touching code. Re-check current
// model IDs/quotas at https://ai.google.dev/gemini-api/docs/models and
// https://ai.google.dev/gemini-api/docs/rate-limits if all of these fail.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
].filter((m): m is string => Boolean(m));

function isModelUnavailableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('"code":404') ||
    message.includes("NOT_FOUND") ||
    message.includes("no longer available") ||
    message.includes('"code":429') ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

// BYOK (Bring Your Own Key): each user supplies their own Gemini API key from
// the browser so API usage/cost is attributed to them, not the app operator.
// process.env.GEMINI_API_KEY is only a fallback for local/self-hosted single-user use.
function resolveApiKey(userProvidedKey?: string): string {
  const apiKey = userProvidedKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini APIキーが設定されていません。画面右上の「APIキー設定」から自分のAPIキーを登録してください。"
    );
  }
  return apiKey;
}

// Shared request path for every structured-JSON call in this module (insight
// generation, title translation): resolves the key, walks MODEL_CANDIDATES
// with fallback, and parses the JSON response.
async function generateJson<T>(
  prompt: string,
  schema: object,
  apiKey: string | undefined,
  temperature: number
): Promise<T> {
  const client = new GoogleGenAI({ apiKey: resolveApiKey(apiKey) });
  const config: GenerateContentConfig = {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature,
  };

  let response;
  let lastError: unknown;
  for (const model of MODEL_CANDIDATES) {
    try {
      response = await client.models.generateContent({ model, contents: prompt, config });
      break;
    } catch (err) {
      lastError = err;
      if (!isModelUnavailableError(err)) throw err; // real failure (bad key, etc.) - don't mask it by trying more models
    }
  }
  if (!response) {
    throw lastError instanceof Error ? lastError : new Error("Geminiモデルが利用できませんでした");
  }

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Geminiから応答がありませんでした");
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error("Geminiの応答をJSONとして解析できませんでした");
  }
}

// Kept as a fixed enum (not freeform text) so values stay consistent for
// display/filtering instead of "アメリカ" vs "米国" vs "USA" drift.
export const COUNTRY_OPTIONS = [
  "日本",
  "アメリカ",
  "中国",
  "イギリス",
  "ドイツ",
  "フランス",
  "カナダ",
  "インド",
  "韓国",
  "イスラエル",
  "その他",
  "不明",
] as const;
export type Country = (typeof COUNTRY_OPTIONS)[number];

export interface GeneratedInsight {
  japaneseTitle: string;
  country: Country;
  summary: string;
  pros: string[];
  cons: string[];
  outlook: string;
  glossary: { term: string; explanation: string }[];
  githubRepo: string | null;
  isBreakingChange: boolean;
  breakingChangeSummary: string | null;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    japaneseTitle: {
      type: "string",
      description:
        "A short, specific Japanese headline (20-40 chars) naming the actual product/feature the article is about, even if the original title is in English or another language. Always Japanese.",
    },
    country: {
      type: "string",
      enum: COUNTRY_OPTIONS,
      description:
        "The country/region this technology, product, or company primarily originates from, based on the article's content (company HQ, research lab, etc). Use 不明 if genuinely unclear.",
    },
    summary: {
      type: "string",
      description:
        "An in-depth Japanese summary (8-12 sentences / several short paragraphs) packed with concrete specifics from the article: named products/features, exactly what they let you do, how they work, concrete numbers/benchmarks, comparisons to prior approaches, and realistic use cases. No vague generalities - this should read like a thorough briefing, not a one-liner.",
    },
    pros: {
      type: "array",
      items: { type: "string" },
      description: "4-6 specific, concrete advantages grounded in the article's content, each 1-2 sentences with detail (not a bare keyword)",
    },
    cons: {
      type: "array",
      items: { type: "string" },
      description: "3-5 specific, concrete concerns/limitations grounded in the article's content, each 1-2 sentences with detail",
    },
    outlook: {
      type: "string",
      description: "今後の展望を3〜5文で、この技術が今後どう発展しうるか・関連分野への影響を具体的に (Japanese)",
    },
    glossary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          explanation: {
            type: "string",
            description:
              "3-4 sentence beginner-friendly explanation: what it is, why it matters here, and a concrete example or analogy - not a one-line dictionary definition",
          },
        },
        required: ["term", "explanation"],
      },
      description:
        "記事本文全体を精査し、初心者がつまずきそうな専門用語・略語・製品固有名詞・前提知識となる基礎概念を6〜10個ピックアップ（記事に明示的に出てくる語だけでなく、それを理解する前提となる基礎用語も含めてよい）。難しい順ではなく、記事を読み進める順序に近い並びにする",
    },
    githubRepo: {
      type: "string",
      description:
        "記事が中心的に扱っているGitHubリポジトリが明確にある場合のみ 'owner/repo' 形式で（例: 'vercel/next.js'）。記事中にGitHubのURLやリポジトリ名が明示されていない場合、または複数あって一つに絞れない場合は空文字列。憶測で補完しないこと。",
    },
    isBreakingChange: {
      type: "boolean",
      description:
        "この記事が、既存のコードを書き換えないと動かなくなるような破壊的変更（メジャーバージョンアップでのAPI廃止、非推奨化、デフォルト挙動の変更など）を報告している場合のみtrue。新機能の追加や単なる性能向上はfalse。",
    },
    breakingChangeSummary: {
      type: "string",
      description: "isBreakingChangeがtrueの場合のみ、何が壊れる可能性があるか1〜2文で。falseの場合は空文字列。",
    },
  },
  required: [
    "japaneseTitle",
    "country",
    "summary",
    "pros",
    "cons",
    "outlook",
    "glossary",
    "githubRepo",
    "isBreakingChange",
    "breakingChangeSummary",
  ],
} as const;

export async function generateInsight(params: {
  title: string;
  text: string;
  apiKey?: string;
}): Promise<GeneratedInsight> {
  const prompt = `あなたは、就活生やエンジニア未経験者に技術トレンドを分かりやすく、かつ深く伝えるメンターです。
以下の技術記事を深く読み込み、指定したJSONスキーマの形式で出力してください。

# 記事タイトル
${params.title}

# 記事本文
${params.text}

# 出力要件（最重要: 一般論・抽象論で済ませず、記事に書かれている具体的な事実を盛り込み、ボリュームのある内容にすること）
- japaneseTitle: 元のタイトルが英語や他言語であっても、何についての記事か一目でわかる日本語の見出しを20〜40字程度で作成（製品名・機能名を含める。必ず日本語）
- country: 記事の内容（企業名・研究機関名など）から、この技術・製品・企業の主な発信国を判定する。判断材料がなければ「不明」
- summary: 「性能が向上した」「便利になった」のような曖昧な表現は禁止。8〜12文程度のボリュームで、記事中の具体的な機能名・数値・仕組み・従来との違い・想定される使いどころを盛り込んだ詳しい要約にすること。例えば新しいAIモデルの発表記事なら「何ができるモデルなのか」「具体的にどんな用途に使えるのか」「どんな新機能・改善点があるのか」「どういう仕組みでそれを実現しているのか」まで踏み込んで説明する
- pros: この記事の内容に基づいた具体的なメリットを4〜6個、それぞれ1〜2文で詳しく（単語の羅列ではなく、なぜメリットなのか・誰にとって嬉しいのかまで書く）
- cons: 同様に具体的な懸念点・制約を3〜5個、それぞれ1〜2文で詳しく
- outlook: 今後の展望を3〜5文で。この技術・製品が今後どう発展しうるか、関連分野や業界にどう影響しそうかまで具体的に
- glossary: 記事本文全体を読み込み、初心者がつまずきそうな専門用語・略語・製品固有名詞・前提知識となる基礎概念を6〜10個ピックアップ。記事に直接出てくる語だけでなく、それを理解するために必要な基礎用語（例: 「LoRA」が出てきたら前提となる「ファインチューニング」も含める）も対象にする。それぞれ3〜4文で、(1)何であるか (2)この記事の文脈でなぜ重要か (3)具体例やたとえ話、を盛り込んで丁寧に解説する（一行の辞書的定義は禁止）。並び順は記事を読み進める順序に近づける
- githubRepo: 記事が中心的に扱っているGitHubリポジトリが明確な場合のみ owner/repo 形式で（例: 'vercel/next.js'）。無ければ空文字列。
- isBreakingChange / breakingChangeSummary: 既存コードが動かなくなる可能性がある破壊的変更（API廃止・非推奨化・デフォルト挙動変更など）を報告している記事かどうかを判定する。単なる新機能追加や性能向上はfalse。trueの場合はbreakingChangeSummaryに何が壊れるかを1〜2文で。falseの場合はbreakingChangeSummaryは空文字列。
- すべて日本語で出力してください。記事に書かれていない情報を推測で補わないでください`;

  const result = await generateJson<GeneratedInsight>(prompt, RESPONSE_SCHEMA, params.apiKey, 0.4);
  // Gemini's structured output can't express null for a string field - it
  // returns "" per the prompt instruction above when no repo/breaking-change was found.
  return {
    ...result,
    githubRepo: result.githubRepo || null,
    breakingChangeSummary: result.isBreakingChange ? result.breakingChangeSummary || null : null,
  };
}

const TITLE_TAG_SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer", description: "0-based index matching the input list" },
          japaneseTitle: { type: "string" },
          country: { type: "string", enum: COUNTRY_OPTIONS },
        },
        required: ["index", "japaneseTitle", "country"],
      },
    },
  },
  required: ["translations"],
} as const;

export interface TitleTag {
  japaneseTitle: string;
  country: Country;
}

// Cheap batch pass so every feed item gets a Japanese title + a rough origin
// country, not just the ones that get a full insight generation - one Gemini
// call handles dozens of short titles, so this barely touches the free-tier
// daily quota compared to summarizing every crawled article individually.
// Country here is a best-effort guess from the title alone (upgraded to a
// content-based guess if the article later gets a full insight generation).
export async function translateTitles(titles: string[], apiKey?: string): Promise<TitleTag[]> {
  if (titles.length === 0) return [];

  const prompt = `以下は技術ニュースサイトの記事タイトル一覧です（英語や他言語を含みます）。
それぞれについて (1) 自然な日本語の見出しへの翻訳・整形と (2) 発信元と思われる国、を判定してください。
japaneseTitle: 元が既に日本語ならそのまま（または軽く整えて）使う。製品名・固有名詞はそのまま残す。
country: タイトルに含まれる企業名・製品名・文脈から発信国を推測する。判断材料がなければ「不明」。

${titles.map((t, i) => `${i}: ${t}`).join("\n")}

各行について index / japaneseTitle / country をJSON配列で返してください。`;

  const parsed = await generateJson<{ translations: { index: number; japaneseTitle: string; country: Country }[] }>(
    prompt,
    TITLE_TAG_SCHEMA,
    apiKey,
    0.2
  );

  const result: TitleTag[] = titles.map((t) => ({ japaneseTitle: t, country: "不明" }));
  for (const t of parsed.translations) {
    if (t.index < 0 || t.index >= result.length) continue;
    if (t.japaneseTitle) result[t.index].japaneseTitle = t.japaneseTitle;
    if (t.country) result[t.index].country = t.country;
  }
  return result;
}

const INTERVIEW_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "技術面接で聞かれそうな質問（日本語）" },
          answerPoints: {
            type: "string",
            description: "模範解答というより「何を盛り込めば良い回答になるか」のポイントを3〜4文で。丸暗記させず、自分の言葉で話せるよう誘導する内容",
          },
          basedOn: { type: "string", description: "この質問の元になった記事タイトル（渡された一覧の中から1つ）" },
        },
        required: ["question", "answerPoints", "basedOn"],
      },
    },
  },
  required: ["questions"],
} as const;

export interface InterviewQuestion {
  question: string;
  answerPoints: string;
  basedOn: string;
}

// User-triggered, personal generation (BYOK) - this is explicitly about
// *their* reading history, not shared/curated content, so it follows the
// same cost-attribution rule as /api/summarize rather than the operator-key
// pattern used for featured picks / AI tool curation.
export async function generateInterviewQuestions(
  articles: { title: string; summary?: string }[],
  apiKey?: string
): Promise<InterviewQuestion[]> {
  const context = articles
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? `\n   要約: ${a.summary.slice(0, 300)}` : ""}`)
    .join("\n");

  const prompt = `あなたは技術面接官です。就活生・エンジニア未経験者が最近読んで保存した以下の技術記事一覧をもとに、
技術面接で実際に聞かれそうな質問を5〜8個作成してください。

# 保存された記事一覧
${context}

# 要件
- 記事の内容を丸暗記させるクイズではなく、「この技術をなぜ・どう使うと良いか」「メリデメ」「実務でどう活かせるか」を自分の言葉で説明させる、実際の面接に近い質問にする
- 1つの記事から複数の質問を作っても良いが、記事一覧全体からバランスよく出題する
- answerPointsは模範解答の丸写しではなく、回答に含めるべき観点を3〜4文で示す（採点基準に近いイメージ）
- basedOnには、その質問の元になった記事のタイトルをそのまま入れる
- すべて日本語で出力してください`;

  const parsed = await generateJson<{ questions: InterviewQuestion[] }>(prompt, INTERVIEW_SCHEMA, apiKey, 0.6);
  return parsed.questions;
}

const HANDS_ON_SCHEMA = {
  type: "object",
  properties: {
    language: {
      type: "string",
      description: "生成したコードの主要言語/ランタイム（例: 'JavaScript', 'Python', 'TypeScript'）",
    },
    isWebPlayable: {
      type: "boolean",
      description:
        "true = ブラウザだけで完結する内容（Node.js/JavaScript/TypeScript/HTML/CSSのみで、外部有償APIキーやGPU等を必要としない）でCodeSandbox等のオンラインエディタでそのまま動かせる。false = ローカル環境やPythonの特殊ライブラリ等が必要で、ブラウザだけでは完結しない。",
    },
    description: { type: "string", description: "このハンズオンで何を体験できるか、2〜3文で" },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string", description: "ファイルパス（例: 'index.js', 'package.json'）" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
      description: "3分程度で動かせる最小構成のファイル一式。package.jsonが必要な場合は含める",
    },
    runInstructions: { type: "string", description: "ローカルで実行する場合の手順を2〜4文で（コマンドを含めてよい）" },
  },
  required: ["language", "isWebPlayable", "description", "files", "runInstructions"],
} as const;

export interface HandsOnCode {
  language: string;
  isWebPlayable: boolean;
  description: string;
  files: { path: string; content: string }[];
  runInstructions: string;
}

// User-triggered, personal generation (BYOK) - same cost-attribution rule as
// the mock interview generator above (about a specific article the user is
// actively reading, not shared/curated content).
export async function generateHandsOnCode(article: { title: string; summary?: string }, apiKey?: string): Promise<HandsOnCode> {
  const prompt = `あなたは実践重視のテックメンターです。以下の技術記事を読んだ人が「読むだけ」で終わらず、
3分程度で実際に手を動かして試せる、最小構成のハンズオンコードを作成してください。

# 記事タイトル
${article.title}
${article.summary ? `\n# 記事の要約\n${article.summary.slice(0, 800)}` : ""}

# 要件
- 記事のテーマに最も適した言語・ランタイムを選ぶ（JavaScript/TypeScript/Node.jsとは限らない。PythonやCLIツールが適切ならそちらを使う）
- 実行するのに有償APIキー・GPU・特殊なクラウド環境を必要としないコードにする（記事のテーマがそもそも大規模モデルの学習など不可能な場合は、その概念を体験できる簡易版・モック版にする）
- isWebPlayableは、生成したコードがNode.js/JavaScript/TypeScript/HTML/CSSのみで完結し、ブラウザ上のオンラインエディタ（外部ネットワークアクセス不要）でそのまま動作する場合のみtrue
- ファイルは最小限（1〜3ファイル程度）。コメントで要点を説明する
- 日本語で説明してください`;

  return generateJson<HandsOnCode>(prompt, HANDS_ON_SCHEMA, apiKey, 0.5);
}
