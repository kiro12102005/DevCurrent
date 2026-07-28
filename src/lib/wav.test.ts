import { describe, it, expect } from "vitest";
import { pcmToWav, parseSampleRate } from "./wav";

describe("pcmToWav", () => {
  it("produces a 44-byte header followed by the raw PCM data unchanged", () => {
    const pcm = Buffer.from([1, 2, 3, 4, 5, 6]);
    const wav = pcmToWav(pcm, 24000);
    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.subarray(44)).toEqual(pcm);
  });

  it("writes a valid RIFF/WAVE header recognizable by standard tooling", () => {
    const wav = pcmToWav(Buffer.alloc(100), 24000);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
  });

  it("encodes sample rate, channel count, and data size correctly for mono 16-bit audio", () => {
    const pcm = Buffer.alloc(1000);
    const wav = pcmToWav(pcm, 24000, 1, 16);
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(22)).toBe(1); // channels
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
    expect(wav.readUInt32LE(28)).toBe(24000 * 1 * 16 / 8); // byte rate
    expect(wav.readUInt32LE(40)).toBe(1000); // data chunk size
    expect(wav.readUInt32LE(4)).toBe(36 + 1000); // RIFF chunk size
  });
});

describe("parseSampleRate", () => {
  it("extracts the rate param from a Gemini TTS mimeType", () => {
    expect(parseSampleRate("audio/L16;codec=pcm;rate=24000")).toBe(24000);
  });

  it("falls back to 24000 when the mimeType has no rate param", () => {
    expect(parseSampleRate("audio/wav")).toBe(24000);
    expect(parseSampleRate(undefined)).toBe(24000);
  });
});
