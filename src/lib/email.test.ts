import { describe, it, expect } from "vitest";
import { escapeHtml } from "./email";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands and quotes", () => {
    expect(escapeHtml('Tom & Jerry "the great"')).toBe("Tom &amp; Jerry &quot;the great&quot;");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("普通のフィードバックです")).toBe("普通のフィードバックです");
  });
});
