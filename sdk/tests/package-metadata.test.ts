import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

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
  });

  it("keeps the npm tarball allowlist explicit", () => {
    expect(pkg.files).toEqual([
      "bin/audit-log-shim.mjs",
      "bin/dry-run-shim.mjs",
      "bin/mcp-server.js",
      "bin/pumble-cli.mjs",
      "bin/pumble-mcp-args.mjs",
      "bin/pumble-mcp.mjs",
      "docs/QUICKSTART.md",
      "esm",
      "src",
    ]);
  });
});
