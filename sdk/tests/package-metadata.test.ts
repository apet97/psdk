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
