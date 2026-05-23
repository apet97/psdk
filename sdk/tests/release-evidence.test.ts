import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const verifDir = resolve(__dirname, "..", "docs", "verification");

const REQUIRED_FIELDS = [
  /^Date:\s+\d{4}-\d{2}-\d{2}/m,
  /^Package:\s+`pumble-sdk@\d+\.\d+\.\d+/m,
  /^Commit:\s+`[0-9a-f]{7,40}`/m,
  /^CI run:\s+https:\/\/github\.com\/.+\/actions\/runs\/\d+/m,
  /^Release run:\s+https:\/\/github\.com\/.+\/actions\/runs\/\d+/m,
  /^npm:\s+https:\/\/www\.npmjs\.com\/package\/pumble-sdk\/v\/\d+\.\d+\.\d+/m,
  /^Provenance:\s+(attested|none)/m,
  /^Tarball SHA-256:\s+`[a-f0-9]{64}`/m,
  /^Live smoke artifact:\s+`.+`/m,
];

describe("release evidence", () => {
  const files = readdirSync(verifDir).filter((f) => /^v\d+\.\d+\.\d+\.md$/.test(f));

  it("at least one verification file exists", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s contains every required field", (file) => {
    const text = readFileSync(join(verifDir, file), "utf8");
    for (const pattern of REQUIRED_FIELDS) {
      expect(text).toMatch(pattern);
    }
  });
});
