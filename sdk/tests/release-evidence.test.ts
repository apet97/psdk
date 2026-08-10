import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const verifDir = resolve(__dirname, "..", "docs", "verification");

const RUN_URL_OR_PENDING = /^(CI run|Release run):\s+(https:\/\/github\.com\/.+\/actions\/runs\/\d+|pending)$/m;

const REQUIRED_FIELDS = [
  /^Date:\s+\d{4}-\d{2}-\d{2}/m,
  /^Package:\s+`pumble-keys-sdk@\d+\.\d+\.\d+/m,
  /^Commit:\s+`[0-9a-f]{7,40}`/m,
  /^CI run:\s+(https:\/\/github\.com\/.+\/actions\/runs\/\d+|pending)$/m,
  /^Release run:\s+(https:\/\/github\.com\/.+\/actions\/runs\/\d+|pending)$/m,
  /^npm:\s+(https:\/\/www\.npmjs\.com\/package\/pumble-keys-sdk\/v\/\d+\.\d+\.\d+|pending)$/m,
  /^Provenance:\s+(attested|none|unverified)$/m,
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

  it.each(files)("%s does not stub a /runs/0 placeholder", (file) => {
    const text = readFileSync(join(verifDir, file), "utf8");
    expect(text).not.toMatch(/\/actions\/runs\/0\b/);
  });

  it.each(files)("%s does not stub an all-zero tarball SHA-256", (file) => {
    const text = readFileSync(join(verifDir, file), "utf8");
    const match = text.match(/^Tarball SHA-256:\s+`([a-f0-9]{64})`/m);
    expect(match, "Tarball SHA-256 line").not.toBeNull();
    expect(match![1], "tarball SHA-256 must not be the all-zero placeholder").not.toBe(
      "0".repeat(64),
    );
  });

  it.each(files)(
    "%s pairs run-URL fields consistently (both real or both pending)",
    (file) => {
      const text = readFileSync(join(verifDir, file), "utf8");
      const ci = text.match(/^CI run:\s+(.+)$/m)?.[1]!.trim();
      const release = text.match(/^Release run:\s+(.+)$/m)?.[1]!.trim();
      expect(ci, "CI run line").toBeDefined();
      expect(release, "Release run line").toBeDefined();
      if (ci === "pending" || release === "pending") {
        // Provenance must be honest when at least one run is missing.
        expect(text).toMatch(/^Provenance:\s+(none|unverified)$/m);
      }
      expect(RUN_URL_OR_PENDING.test(`CI run: ${ci}`)).toBe(true);
      expect(RUN_URL_OR_PENDING.test(`Release run: ${release}`)).toBe(true);
    },
  );
});
