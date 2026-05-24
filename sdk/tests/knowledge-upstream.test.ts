import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const upstreamDir = resolve(__dirname, "..", "knowledge", "upstream");

const REQUIRED_FILES = [
  "events/index.ts",
  "events/README.md",
  "blocks/types.ts",
];

const REQUIRED_MARKERS = [
  "@derived-from CAKE-com/pumble-node-sdk",
  "@upstream-path",
  "@license ISC",
];

describe("upstream knowledge tree", () => {
  it.each(REQUIRED_FILES)("contains %s", (f) => {
    expect(() => statSync(join(upstreamDir, f))).not.toThrow();
  });

  it("every file under upstream/ carries the attribution header", () => {
    for (const absolute of walk(upstreamDir)) {
      const text = readFileSync(absolute, "utf8");
      for (const marker of REQUIRED_MARKERS) {
        expect(text, `${absolute}: ${marker}`).toContain(marker);
      }
    }
  });

  it("events/index.ts contains only type-level declarations", () => {
    const text = readFileSync(join(upstreamDir, "events", "index.ts"), "utf8");
    expect(text, "no function declarations").not.toMatch(
      /^\s*export\s+(?:default\s+)?(?:async\s+)?function\s/m,
    );
    expect(text, "no class declarations").not.toMatch(/^\s*export\s+class\s/m);
    expect(text, "no top-level new expressions").not.toMatch(/^\s*const\s+\w+\s*=\s*new\s/m);
  });

  it("blocks/types.ts contains only type-level declarations", () => {
    const text = readFileSync(join(upstreamDir, "blocks", "types.ts"), "utf8");
    expect(text).not.toMatch(/^\s*export\s+(?:default\s+)?function\s/m);
    expect(text).not.toMatch(/^\s*export\s+class\s/m);
  });

  it("README documents the boundary explicitly", () => {
    const text = readFileSync(join(upstreamDir, "events", "README.md"), "utf8");
    expect(text).toContain("API-Keys add-on");
    expect(text).toContain("CAKE-com/pumble-node-sdk");
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}
