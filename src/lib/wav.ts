// Gemini's TTS models return raw PCM (observed: "audio/L16;codec=pcm;rate=24000",
// mono, 16-bit) - not a playable file on its own. Every browser/player expects
// a container format, so this wraps the raw samples in a minimal 44-byte WAV
// header. Verified against a real generateContent call before writing this
// (see commit message) rather than assuming the exact mimeType/layout.
export function pcmToWav(pcm: Buffer, sampleRate: number, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

// Parses "audio/L16;codec=pcm;rate=24000" -> 24000. Falls back to Gemini's
// documented default (24kHz) if the mimeType doesn't include a rate param.
export function parseSampleRate(mimeType: string | undefined): number {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : 24000;
}
