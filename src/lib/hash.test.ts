import { describe, it, expect } from "vitest";
import { normalizeUrl, sha256 } from "./hash";

describe("normalizeUrl", () => {
  it("strips the URL fragment", () => {
    expect(normalizeUrl("https://example.com/article#section-2")).toBe("https://example.com/article");
  });

  it("strips known tracking params but keeps others", () => {
    const result = normalizeUrl("https://example.com/a?utm_source=x&utm_medium=y&ref=z&id=42");
    expect(result).toBe("https://example.com/a?id=42");
  });

  it("removes a trailing slash from the path, but not the bare root path", () => {
    expect(normalizeUrl("https://example.com/article/")).toBe("https://example.com/article");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("treats two URLs that differ only by tracking params/fragment as equal after normalization", () => {
    const a = normalizeUrl("https://example.com/post?utm_source=twitter#comments");
    const b = normalizeUrl("https://example.com/post");
    expect(a).toBe(b);
  });
});

describe("sha256", () => {
  it("produces a stable 64-char hex digest", () => {
    const digest = sha256("hello world");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(sha256("hello world"));
  });

  it("produces different digests for different input", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
});
