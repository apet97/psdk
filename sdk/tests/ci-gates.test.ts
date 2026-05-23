import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const path = resolve(__dirname, "..", "docs", "CI-GATES.md");

const REQUIRED_GATES = [
  "Offline verification",
  "Speakeasy regeneration",
  "Live Arazzo",
  "Live search",
  "Facade live smoke",
  "Curated MCP live smoke",
  "Release required verification",
];

describe("CI gate matrix", () => {
  const doc = readFileSync(path, "utf8");

  it.each(REQUIRED_GATES)("documents '%s'", (gate) => {
    expect(doc).toContain(gate);
  });

  it("explains when each gate runs vs skips", () => {
    expect(doc).toMatch(/Runs on/i);
    expect(doc).toMatch(/Skips when/i);
  });
});
