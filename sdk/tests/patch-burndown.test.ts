import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const docPath = resolve(__dirname, "..", "docs", "patch-burndown.md");
const countPath = resolve(__dirname, "..", "docs", "PATCH-COUNT.txt");
const scriptPath = resolve(__dirname, "..", "scripts", "patch-generated-runtime.mjs");

const KNOWN_PATCH_IDS = [
  "non-idempotent-write-retries",
  "debug-redaction",
  "malformed-json-response",
  "outbound-write-validation",
  "retry-backoff-first-delay",
];

describe("patch burndown", () => {
  const doc = readFileSync(docPath, "utf8");
  const script = readFileSync(scriptPath, "utf8");
  const count = Number.parseInt(readFileSync(countPath, "utf8").trim(), 10);

  it("PATCH-COUNT matches the registered patches", () => {
    expect(count).toBe(KNOWN_PATCH_IDS.length);
  });

  it.each(KNOWN_PATCH_IDS)("patch '%s' appears in script and doc", (id) => {
    expect(script).toContain(`"${id}"`);
    expect(doc).toContain(id);
  });

  it("doc includes a removal-condition column per patch", () => {
    const rows = doc.split("\n").filter((l) => KNOWN_PATCH_IDS.some((id) => l.includes(id)));
    for (const row of rows) {
      expect(row).toMatch(/\|.+\|.+\|.+\|/);
    }
  });
});
