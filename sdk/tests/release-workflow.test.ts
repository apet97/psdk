import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const releaseWorkflow = readFileSync(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

describe("release workflow parity", () => {
  it("uses Node 24-compatible official actions", () => {
    expect(releaseWorkflow).toContain("actions/checkout@v5");
    expect(releaseWorkflow).toContain("actions/setup-node@v5");
    expect(releaseWorkflow).not.toContain("actions/checkout@v4");
    expect(releaseWorkflow).not.toContain("actions/setup-node@v4");
  });

  it("enforces the same strict Speakeasy lint result as CI", () => {
    expect(releaseWorkflow).toContain("0 errors, 0 warnings");
    expect(releaseWorkflow).toContain("speakeasy lint reported issues");
  });

  it("requires Speakeasy credentials before release regeneration", () => {
    expect(releaseWorkflow).toContain("SPEAKEASY_API_KEY: ${{ secrets.SPEAKEASY_API_KEY }}");
    expect(releaseWorkflow).toContain("SPEAKEASY_API_KEY secret is required");
    expect(releaseWorkflow).toContain("speakeasy generate sdk");
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
