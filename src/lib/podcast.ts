import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { generatePodcastScript, generatePodcastAudio } from "@/lib/gemini";
import { getWeeklyPicks } from "@/lib/weeklyPicks";
import { pcmToWav, parseSampleRate } from "@/lib/wav";
import { jstTodayString } from "@/lib/dateRange";
import { SOURCE_LABEL } from "@/lib/sourceLabels";

const PICKS_PER_SOURCE = 2; // ~top 5-6 articles, matches the "top 5" framing this was scoped from
const OVERVIEW_LENGTH = 120; // short "at a glance" blurb shown in the UI - not the full in-depth summary

// One shared episode per day (JST) - same "operator-funded, shared content"
// pattern as AiToolPick and the featured-pick auto-summaries. Idempotent:
// PodcastEpisode.date is unique, so calling this twice the same day just
// returns the existing episode instead of spending a second TTS generation.
export async function generateDailyEpisode(): Promise<{ episode: { date: string; audioUrl: string } | null; skipped: string }> {
  if (!process.env.GEMINI_API_KEY) {
    return { episode: null, skipped: "GEMINI_API_KEY未設定のためポッドキャスト生成はスキップされました" };
  }

  const today = jstTodayString();
  const existing = await prisma.podcastEpisode.findUnique({ where: { date: today } });
  if (existing) {
    return { episode: { date: existing.date, audioUrl: existing.audioUrl }, skipped: "" };
  }

  const picks = await getWeeklyPicks(PICKS_PER_SOURCE);
  if (picks.length === 0) {
    return { episode: null, skipped: "今週のピックアップ記事がありませんでした" };
  }

  const lines = await generatePodcastScript(
    picks.map((p) => ({ title: p.title, summary: p.summary, sourceLabel: SOURCE_LABEL[p.sourceType] }))
  );
  if (lines.length === 0) {
    return { episode: null, skipped: "台本の生成に失敗しました" };
  }

  const audio = await generatePodcastAudio(lines);
  const sampleRate = parseSampleRate(audio.mimeType);
  const wav = pcmToWav(Buffer.from(audio.data, "base64"), sampleRate);
  const durationSec = Math.round(wav.length / (sampleRate * 2)); // 16-bit mono -> 2 bytes/sample

  // allowOverwrite: PodcastEpisode.date being unique normally prevents this
  // path from running twice the same day, but the DB row and the Blob file
  // aren't updated atomically - if the row is ever missing while a same-day
  // file still exists (e.g. a manually-cleared row, or a retry after a
  // mid-request failure), this should overwrite rather than error.
  const blob = await put(`podcasts/${today}.wav`, wav, {
    access: "public",
    contentType: "audio/wav",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const script = lines.map((l) => `${l.speaker === "Speaker1" ? "🅰️" : "🅱️"} ${l.text}`).join("\n\n");

  // Shown in the UI alongside the player so listeners can see which
  // articles/sources this episode covers and a quick gist, without needing
  // to catch every word of the audio itself.
  const sourceArticles = picks.map((p) => ({
    title: p.title,
    url: p.url,
    sourceType: p.sourceType,
    summary: p.summary ? p.summary.slice(0, OVERVIEW_LENGTH) + (p.summary.length > OVERVIEW_LENGTH ? "…" : "") : null,
  }));

  const episode = await prisma.podcastEpisode.create({
    data: { date: today, audioUrl: blob.url, script, durationSec, sourceArticles: JSON.stringify(sourceArticles) },
  });

  return { episode: { date: episode.date, audioUrl: episode.audioUrl }, skipped: "" };
}
