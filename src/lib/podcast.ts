import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { generatePodcastScript, generatePodcastAudio } from "@/lib/gemini";
import { getWeeklyPicks } from "@/lib/weeklyPicks";
import { pcmToWav, parseSampleRate } from "@/lib/wav";
import { jstTodayString } from "@/lib/dateRange";

const PICKS_PER_SOURCE = 2; // ~top 5-6 articles, matches the "top 5" framing this was scoped from

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

  const lines = await generatePodcastScript(picks);
  if (lines.length === 0) {
    return { episode: null, skipped: "台本の生成に失敗しました" };
  }

  const audio = await generatePodcastAudio(lines);
  const sampleRate = parseSampleRate(audio.mimeType);
  const wav = pcmToWav(Buffer.from(audio.data, "base64"), sampleRate);
  const durationSec = Math.round(wav.length / (sampleRate * 2)); // 16-bit mono -> 2 bytes/sample

  const blob = await put(`podcasts/${today}.wav`, wav, {
    access: "public",
    contentType: "audio/wav",
    addRandomSuffix: false,
  });

  const script = lines.map((l) => `${l.speaker === "Speaker1" ? "🅰️" : "🅱️"} ${l.text}`).join("\n\n");

  const episode = await prisma.podcastEpisode.create({
    data: { date: today, audioUrl: blob.url, script, durationSec },
  });

  return { episode: { date: episode.date, audioUrl: episode.audioUrl }, skipped: "" };
}
