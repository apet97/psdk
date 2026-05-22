import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const releaseWorkflow = readFileSync(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

describe("release workflow parity", () => {
  it("enforces the same strict Speakeasy lint result as CI", () => {
    expect(releaseWorkflow).toContain("0 errors, 0 warnings");
    expect(releaseWorkflow).toContain("speakeasy lint reported issues");
  });

  it("guards generated-regeneration drift in hand-written release paths", () => {
    for (const guardedPath of [
      "sdk/src/extensions",
      "sdk/tests",
      "sdk/scripts",
      "sdk/bin/pumble-cli.mjs",
      "sdk/bin/pumble-mcp.mjs",
      "sdk/bin/pumble-mcp-args.mjs",
      "sdk/bin/dry-run-shim.mjs",
      "sdk/bin/audit-log-shim.mjs",
      "sdk/package.json",
      "sdk/package-lock.json",
    ]) {
      expect(releaseWorkflow).toContain(guardedPath);
    }
  });
});
