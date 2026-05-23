import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(resolve(__dirname, "..", "docs", "SECURITY-CHECKLIST.md"), "utf8");

const REQUIRED_SECTIONS = ["Secrets", "Webhooks", "MCP", "CI"];

const REQUIRED_BULLETS = [
  /No API keys appear in docs, fixtures, examples, or tests/,
  /Signature verification rejects body tampering/,
  /Curated profile is the default in published binary/,
  /scan-fixtures\.mjs/,
];

describe("security checklist", () => {
  it.each(REQUIRED_SECTIONS)("has '%s' section", (section) => {
    expect(text).toContain(`## ${section}`);
  });

  it.each(REQUIRED_BULLETS)("contains bullet matching %s", (re) => {
    expect(text).toMatch(re);
  });
});
