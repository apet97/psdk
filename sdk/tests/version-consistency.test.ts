import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line import/no-unresolved
import { checkVersionConsistency } from "../scripts/version-consistency.mjs";

function tmpRepo(
  pkgVersion: string,
  changelog: string,
  verificationVersion?: string,
) {
  const repo = mkdtempSync(join(tmpdir(), "ver-cons-"));
  const sdk = join(repo, "sdk");
  mkdirSync(sdk, { recursive: true });
  writeFileSync(join(sdk, "package.json"), JSON.stringify({ version: pkgVersion }));
  writeFileSync(join(repo, "CHANGELOG.md"), changelog);
  if (verificationVersion !== undefined) {
    const verifDir = join(sdk, "docs", "verification");
    mkdirSync(verifDir, { recursive: true });
    writeFileSync(join(verifDir, `v${verificationVersion}.md`), "# verification\n");
  }
  return { repoRoot: repo, sdkRoot: sdk };
}

describe("version consistency", () => {
  it("passes when all three sources agree", () => {
    const { sdkRoot, repoRoot } = tmpRepo(
      "0.4.0",
      "# CHANGELOG\n\n## Unreleased\n\n## 0.4.0\n",
      "0.4.0",
    );
    expect(checkVersionConsistency({ sdkRoot, repoRoot })).toEqual([]);
  });

  it("fails when package version is ahead of CHANGELOG", () => {
    const { sdkRoot, repoRoot } = tmpRepo(
      "0.4.0",
      "# CHANGELOG\n\n## 0.3.21\n",
      "0.4.0",
    );
    const errors = checkVersionConsistency({ sdkRoot, repoRoot });
    expect(errors.some((e) => e.includes("0.4.0"))).toBe(true);
  });

  it("fails when verification doc is missing", () => {
    const { sdkRoot, repoRoot } = tmpRepo(
      "0.4.0",
      "# CHANGELOG\n\n## 0.4.0\n",
    );
    const errors = checkVersionConsistency({ sdkRoot, repoRoot });
    expect(errors.some((e) => e.includes("v0.4.0.md"))).toBe(true);
  });

  it("tolerates an Unreleased section above the latest version", () => {
    const { sdkRoot, repoRoot } = tmpRepo(
      "0.4.0",
      "# CHANGELOG\n\n## Unreleased\n\n### Foo\n- bar\n\n## 0.4.0\n",
      "0.4.0",
    );
    expect(checkVersionConsistency({ sdkRoot, repoRoot })).toEqual([]);
  });

  it("fails when CHANGELOG.md is missing", () => {
    const { sdkRoot } = tmpRepo("0.4.0", "# CHANGELOG\n", "0.4.0");
    const errors = checkVersionConsistency({
      sdkRoot,
      repoRoot: join(sdkRoot, "..", "not-a-real-repo"),
    });
    expect(errors.some((e) => /CHANGELOG/i.test(e))).toBe(true);
  });

  it("accepts pre-release suffixes such as 0.4.0-rc.1", () => {
    const { sdkRoot, repoRoot } = tmpRepo(
      "0.4.0-rc.1",
      "# CHANGELOG\n\n## Unreleased\n\n## 0.4.0-rc.1\n",
      "0.4.0-rc.1",
    );
    expect(checkVersionConsistency({ sdkRoot, repoRoot })).toEqual([]);
  });
});
