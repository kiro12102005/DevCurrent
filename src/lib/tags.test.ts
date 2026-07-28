import { describe, it, expect } from "vitest";
import { deriveTags } from "./tags";

describe("deriveTags", () => {
  it("matches a single relevant tag from an English title", () => {
    expect(deriveTags("Next.js 16 released with big changes")).toContain("フロントエンド");
  });

  it("matches multiple tags when a title spans categories", () => {
    const tags = deriveTags("KubernetesとPostgresを使ったAIエージェント基盤の構築");
    expect(tags).toContain("インフラ・クラウド");
    expect(tags).toContain("データベース");
    expect(tags).toContain("AI・機械学習");
  });

  it("is case-insensitive", () => {
    expect(deriveTags("REACT vs react vs React")).toContain("フロントエンド");
  });

  it("returns an empty array when nothing matches (not an error)", () => {
    expect(deriveTags("猫が可愛いという話")).toEqual([]);
  });
});
