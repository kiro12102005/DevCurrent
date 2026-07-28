import { describe, it, expect } from "vitest";
import { extractDependencyKeywords } from "./repoCheck";

describe("extractDependencyKeywords", () => {
  it("maps a known package name to its human-readable alias", () => {
    const result = extractDependencyKeywords({ dependencies: { next: "16.0.0" } });
    expect(result).toEqual([{ keyword: "Next.js", pkgName: "next" }]);
  });

  it("combines dependencies and devDependencies", () => {
    const result = extractDependencyKeywords({
      dependencies: { react: "19.0.0" },
      devDependencies: { typescript: "5.0.0" },
    });
    const keywords = result.map((r) => r.keyword).sort();
    expect(keywords).toEqual(["React", "TypeScript"]);
  });

  // Regression test: @eslint/js's scope-stripped fallback name is "js", which
  // substring-matches almost any article mentioning "Next.js". Found via a
  // live check against vercel/next.js's real package.json before this
  // feature shipped (repo-check API route) - see the GENERIC_REMNANTS
  // denylist in repoCheck.ts.
  it("excludes generic scope-stripped remnants like @eslint/js -> 'js'", () => {
    const result = extractDependencyKeywords({ devDependencies: { "@eslint/js": "9.0.0" } });
    expect(result).toEqual([]);
  });

  it("excludes other known-generic remnants (@babel/core -> 'core', etc.)", () => {
    const result = extractDependencyKeywords({
      devDependencies: { "@babel/core": "7.0.0", "@types/node": "20.0.0" },
    });
    // @babel/core's remnant "core" is denylisted; @types/node's remnant "node" is not
    expect(result).toEqual([{ keyword: "node", pkgName: "@types/node" }]);
  });

  it("falls back to the scope-stripped name for unknown-but-specific packages", () => {
    const result = extractDependencyKeywords({ dependencies: { "@vercel/blob": "1.0.0" } });
    expect(result).toEqual([{ keyword: "blob", pkgName: "@vercel/blob" }]);
  });

  it("returns an empty array for malformed or missing input", () => {
    expect(extractDependencyKeywords(null)).toEqual([]);
    expect(extractDependencyKeywords(undefined)).toEqual([]);
    expect(extractDependencyKeywords("not an object")).toEqual([]);
    expect(extractDependencyKeywords({})).toEqual([]);
  });
});
