import { describe, it, expect } from "vitest";
import { composeBreakingChangePayload } from "./push";

describe("composeBreakingChangePayload", () => {
  it("links directly to the article when there's exactly one", () => {
    const payload = composeBreakingChangePayload([{ title: "Next.js 16 breaking change", url: "https://example.com/a" }]);
    expect(payload).toEqual({
      title: "🚨 既存コードが動かなくなるかも",
      body: "Next.js 16 breaking change",
      url: "https://example.com/a",
    });
  });

  it("summarizes and links to the feed when there are multiple", () => {
    const payload = composeBreakingChangePayload([
      { title: "Article A", url: "https://example.com/a" },
      { title: "Article B", url: "https://example.com/b" },
    ]);
    expect(payload.title).toBe("🚨 動作に影響しそうな記事を2件検知");
    expect(payload.body).toBe("Article A / Article B");
    expect(payload.url).toBe("/");
  });
});
