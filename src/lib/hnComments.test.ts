import { describe, it, expect, vi, afterEach } from "vitest";
import { stripHtml, fetchHnComments } from "./hnComments";

describe("stripHtml", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>hello <b>world</b></p>")).toBe("hello world");
  });

  // Regression test: the original implementation didn't decode &#x27;/&#39;
  // (apostrophe), so real HN comments like "don&#x27;t" rendered garbled.
  // Found via a live test against real HN comment threads before this
  // feature shipped.
  it("decodes the apostrophe entity (&#x27; and &#39;)", () => {
    expect(stripHtml("I don&#x27;t know")).toBe("I don't know");
    expect(stripHtml("can&#39;t stop")).toBe("can't stop");
  });

  it("decodes other common HTML entities", () => {
    expect(stripHtml("a &amp; b &lt;tag&gt; &quot;quoted&quot; c&#x2F;d")).toBe('a & b <tag> "quoted" c/d');
  });

  it("collapses whitespace left over from stripped tags", () => {
    expect(stripHtml("a<br>b\n\nc   d")).toBe("a b c d");
  });
});

describe("fetchHnComments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no matching HN thread is found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hits: [] }) })
    );
    const result = await fetchHnComments("https://example.com/no-thread");
    expect(result).toBeNull();
  });

  it("returns null when the thread has fewer comments than the minimum", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [{ objectID: "123", url: "x" }] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ children: [{ text: "only one comment" }] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchHnComments("https://example.com/thin-thread");
    expect(result).toBeNull();
  });

  it("returns cleaned comment text when enough comments exist", async () => {
    const children = Array.from({ length: 6 }, (_, i) => ({ text: `comment number ${i} with &#x27;quote&#x27;` }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [{ objectID: "123", url: "x" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ children }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchHnComments("https://example.com/real-thread");
    expect(result).not.toBeNull();
    expect(result?.length).toBe(6);
    expect(result?.[0]).toBe("comment number 0 with 'quote'");
  });
});
