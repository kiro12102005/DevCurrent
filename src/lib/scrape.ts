import * as cheerio from "cheerio";

const MAX_CHARS = 16000; // keep prompt small -> fewer input tokens -> free tier friendly, but leave room for a properly deep summary

export interface ScrapedArticle {
  title: string;
  text: string;
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TechTrendCatchupBot/0.1; +https://example.com/bot)",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`URLの取得に失敗しました (HTTP ${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, noscript, iframe, svg").remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  const candidates = ["article", "main", "#content", ".article", "body"];
  let text = "";
  for (const selector of candidates) {
    const el = $(selector).first();
    if (el.length) {
      text = el.text();
      if (text.trim().length > 200) break;
    }
  }

  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length < 50) {
    throw new Error("記事本文を抽出できませんでした。別のURLをお試しください。");
  }

  return {
    title: title.slice(0, 300),
    text: cleaned.slice(0, MAX_CHARS),
  };
}
