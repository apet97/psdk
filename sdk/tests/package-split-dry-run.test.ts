import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = join(__dirname, "..");
const dryRunScript = join(sdkRoot, "scripts/package-split-dry-run.mjs");

type SplitReport = {
  mode: "dry-run";
  decision: string;
  packages: Array<{
    name: string;
    sources: string[];
    docs: string[];
    tests: string[];
  }>;
};

describe("package split dry run", () => {
  test("reports source/docs/tests for every future package without moving files", () => {
    const packageJsonPath = join(sdkRoot, "package.json");
    const beforeMtime = statSync(packageJsonPath).mtimeMs;

    const output = execFileSync("node", [dryRunScript, "--json"], {
      cwd: sdkRoot,
      encoding: "utf8",
    });
    const report = JSON.parse(output) as SplitReport;

    expect(report.mode).toBe("dry-run");
    expect(report.decision).toContain("no files moved");
    expect(report.packages.map((pkg) => pkg.name)).toEqual([
      "@pumble/sdk-core",
      "@pumble/webhooks",
      "@pumble/testing",
      "@pumble/app-framework",
      "@pumble/mcp",
    ]);

    for (const pkg of report.packages) {
      expect(pkg.sources.length, `${pkg.name} source files`).toBeGreaterThan(0);
      expect(pkg.docs.length, `${pkg.name} docs`).toBeGreaterThan(0);
      expect(pkg.tests.length, `${pkg.name} tests`).toBeGreaterThan(0);

      for (const path of [...pkg.sources, ...pkg.docs, ...pkg.tests]) {
        expect(existsSync(join(sdkRoot, path)), `${pkg.name}: ${path}`).toBe(true);
      }
    }

    expect(statSync(packageJsonPath).mtimeMs).toBe(beforeMtime);
  });
});
