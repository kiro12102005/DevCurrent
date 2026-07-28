import { describe, it, expect } from "vitest";
import { parseGeneration } from "./summarize";

function makeRow(prosAndCons: object, glossary: unknown[] = []) {
  return {
    summary: "test summary",
    prosAndCons: JSON.stringify(prosAndCons),
    glossary: JSON.stringify(glossary),
  };
}

describe("parseGeneration", () => {
  it("parses a full row with all optional fields present", () => {
    const insight = parseGeneration(
      makeRow({
        pros: ["p1"],
        cons: ["c1"],
        outlook: "bright",
        githubRepo: "vercel/next.js",
        isBreakingChange: true,
        breakingChangeSummary: "params is now a promise",
        debateMatrix: { pro: ["fast"], con: ["risky"] },
      })
    );
    expect(insight).toEqual({
      summary: "test summary",
      pros: ["p1"],
      cons: ["c1"],
      outlook: "bright",
      githubRepo: "vercel/next.js",
      isBreakingChange: true,
      breakingChangeSummary: "params is now a promise",
      debateMatrix: { pro: ["fast"], con: ["risky"] },
      glossary: [],
    });
  });

  // Rows created before a given optional field existed (githubRepo,
  // isBreakingChange, debateMatrix were all added after the initial schema)
  // won't have that key in their stored JSON at all - parseGeneration must
  // default them instead of returning `undefined`.
  it("defaults missing optional fields for older rows without them", () => {
    const insight = parseGeneration(makeRow({ pros: [], cons: [], outlook: "" }));
    expect(insight.githubRepo).toBeNull();
    expect(insight.isBreakingChange).toBe(false);
    expect(insight.breakingChangeSummary).toBeNull();
    expect(insight.debateMatrix).toBeNull();
  });

  it("parses the glossary field independently from prosAndCons", () => {
    const insight = parseGeneration(
      makeRow({ pros: [], cons: [], outlook: "" }, [{ term: "LoRA", explanation: "..." }])
    );
    expect(insight.glossary).toEqual([{ term: "LoRA", explanation: "..." }]);
  });
});
