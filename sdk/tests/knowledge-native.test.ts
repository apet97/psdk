import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const nativeDir = resolve(__dirname, "..", "knowledge", "native");
const MAX_BYTES = 8 * 1024;
const REQUIRED_FILES = ["README.md", "glossary.md", "api-shape.md", "error-model.md"];

describe("native knowledge tree", () => {
  it.each(REQUIRED_FILES)("contains %s", (f) => {
    expect(() => statSync(join(nativeDir, f))).not.toThrow();
  });

  it.each(readdirSync(nativeDir))(
    "%s is structurally valid markdown <= 8 KB",
    (f) => {
      const path = join(nativeDir, f);
      const stat = statSync(path);
      expect(stat.size, `${f}: size`).toBeLessThanOrEqual(MAX_BYTES);
      const text = readFileSync(path, "utf8");
      expect(text, `${f}: H1`).toMatch(/^# .+/m);
      const h2Count = [...text.matchAll(/^## .+/gm)].length;
      expect(h2Count, `${f}: >=2 H2 sections`).toBeGreaterThanOrEqual(2);
    },
  );

  it("does not reference upstream-only concepts", () => {
    const forbidden = [
      "slash command",
      "modal",
      "OAuth install",
      "Socket Mode",
      "view submission",
    ];
    for (const f of readdirSync(nativeDir)) {
      const text = readFileSync(join(nativeDir, f), "utf8");
      for (const phrase of forbidden) {
        expect(
          text.toLowerCase(),
          `${f}: forbidden "${phrase}"`,
        ).not.toContain(phrase.toLowerCase());
      }
    }
  });
});
