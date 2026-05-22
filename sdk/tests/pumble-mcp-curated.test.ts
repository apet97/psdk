import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildMcpInvocation } from "../bin/pumble-mcp-args.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("pumble-mcp curated profile", () => {
  it("launches the curated MCP server entrypoint", () => {
    const invocation = buildMcpInvocation({
      argv: ["start", "--profile", "curated"],
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
    });

    expect(invocation.effectiveProfile).toBe("curated");
    expect(invocation.nodeArgs).toEqual([
      "/tmp/pumble-mcp-curated.js",
      "start",
    ]);
  });

  it("does not add a raw generated tool allowlist", () => {
    const invocation = buildMcpInvocation({
      argv: ["start", "--profile", "curated"],
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
    });

    expect(invocation.tools).toEqual([]);
    expect(invocation.args).toEqual(["start"]);
    expect(invocation.args).not.toContain("--tool");
  });

  it("documents the curated profile in pumble-mcp help", () => {
    const result = spawnSync(
      process.execPath,
      [join(__dirname, "../bin/pumble-mcp.mjs"), "--help"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--profile curated");
    expect(result.stdout).toContain("workflow-first curated tools");
  });
});
