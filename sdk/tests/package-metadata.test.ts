import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));
const gen = parse(readFileSync(join(__dirname, "../.speakeasy/gen.yaml"), "utf8"));

describe("package metadata", () => {
  it("publishes only the supported CLI bins", () => {
    expect(Object.keys(pkg.bin).sort()).toEqual(["pumble", "pumble-mcp"]);
    expect(pkg.bin).toEqual({
      pumble: "./bin/pumble-cli.mjs",
      "pumble-mcp": "./bin/pumble-mcp.mjs",
    });
  });

  it("declares npm metadata needed for a public package", () => {
    expect(pkg.description).toBe("TypeScript SDK and MCP server for the Pumble API-Keys add-on");
    expect(pkg.license).toBe("MIT");
    expect(pkg.engines).toEqual({ node: ">=20" });
    expect(pkg.repository).toEqual({
      type: "git",
      url: "git+https://github.com/apet97/psdk.git",
      directory: "sdk",
    });
    expect(pkg.homepage).toBe("https://github.com/apet97/psdk#readme");
    expect(pkg.bugs).toEqual({ url: "https://github.com/apet97/psdk/issues" });
    expect(pkg.keywords).toEqual([
      "pumble",
      "sdk",
      "typescript",
      "api-client",
      "mcp",
      "cli",
      "webhooks",
    ]);
  });

  it("does not expose wildcard package exports", () => {
    expect(Object.keys(pkg.exports)).not.toContain("./*.js");
    expect(Object.keys(pkg.exports)).not.toContain("./*");
  });

  it("declares release parity and package planning scripts", () => {
    expect(pkg.scripts.verify).toBe("npm run verify:offline && npm run verify:live");
    expect(pkg.scripts["verify:live"]).toBe("node scripts/verify-live.mjs");
    expect(pkg.scripts["test:facade:live"]).toBe("node scripts/run-facade-live.mjs");
    expect(pkg.scripts["test:mcp:live"]).toBe("node scripts/run-mcp-live.mjs");
    expect(pkg.scripts["package-split:dry-run"]).toBe(
      "node scripts/package-split-dry-run.mjs",
    );
    expect(pkg.scripts.prepublishOnly).not.toBe("npm run build");
    expect(pkg.scripts.prepublishOnly).toContain("verify:offline");

    for (const gate of [
      "npm run spec:audit",
      "npm run build",
      "npm run lint",
      "npm test",
      "npm run test:arazzo:replay",
      "npm run test:live:replay",
      "npm run test:fixtures:scan",
      "npm run test:pack -- --skip-build",
      "npm run bench:smoke",
    ]) {
      expect(pkg.scripts["verify:offline"]).toContain(gate);
    }
  });

  it("keeps the npm tarball allowlist explicit", () => {
    expect(pkg.files).toEqual([
      "bin/audit-log-shim.mjs",
      "bin/dry-run-shim.mjs",
      "bin/mcp-server.js",
      "bin/pumble-cli.mjs",
      "bin/pumble-mcp-args.mjs",
      "bin/pumble-mcp-curated.js",
      "bin/pumble-mcp.mjs",
      "docs/API-REFERENCE.md",
      "docs/ERRORS.md",
      "docs/INTEGRATION-USAGE.md",
      "docs/MCP-SAFETY.md",
      "docs/PACKAGE-SPLIT.md",
      "docs/QUICKSTART.md",
      "docs/STABILITY.md",
      "docs/SUPPORT.md",
      "docs/MIGRATING.md",
      "docs/verification/v0.3.21.md",
      "esm",
      "src",
    ]);
  });

  it("keeps Speakeasy package file allowlist in parity with normalized package metadata", () => {
    expect(gen.typescript.additionalPackageJSON.files).toEqual(pkg.files);
  });
});

import { runSurfaceAudit } from "../scripts/public-surface-audit.mjs";

import { execFileSync } from "node:child_process";

import { readdirSync } from "node:fs";

describe("version consistency", () => {
  const pkgVersion = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ).version as string;
  const changelog = readFileSync(join(__dirname, "..", "..", "CHANGELOG.md"), "utf8");
  const latestVerif = readdirSync(join(__dirname, "..", "docs", "verification"))
    .filter((f) => /^v\d+\.\d+\.\d+\.md$/.test(f))
    .sort()
    .pop();

  it("CHANGELOG mentions current version", () => {
    expect(changelog).toContain(pkgVersion);
  });

  it("verification doc exists for current version", () => {
    expect(latestVerif).toBe(`v${pkgVersion}.md`);
  });
});

describe("npm pack budget", () => {
  function pack() {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: join(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return JSON.parse(out)[0] as { size: number; files: Array<{ path: string }> };
  }

  it("tarball size remains under the budget", () => {
    const SIZE_BUDGET_BYTES = 2_500_000;
    expect(pack().size).toBeLessThan(SIZE_BUDGET_BYTES);
  });

  it("tarball excludes test, script, and example trees", () => {
    const paths = pack().files.map((f) => f.path);
    for (const path of paths) {
      expect(path).not.toMatch(/\.test\.[jt]sx?$/);
      expect(path).not.toMatch(/(^|\/)tests\//);
      expect(path).not.toMatch(/(^|\/)scripts\//);
      expect(path).not.toMatch(/(^|\/)examples\//);
      expect(path).not.toMatch(/(^|\/)\.speakeasy\//);
    }
  });
});

describe("public surface tiers", () => {
  const report = runSurfaceAudit();

  it("every export has a stability tier", () => {
    expect(report.missingTier).toEqual([]);
  });

  it("experimental exports do not appear in the README headline section", () => {
    expect(report.experimentalLeaksInReadme).toEqual([]);
  });
});
