import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildMcpInvocation } from "../bin/pumble-mcp-args.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function spawnNode(args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

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

  it("flushes curated help when stdout is captured by async spawn", async () => {
    const result = await spawnNode([
      join(__dirname, "../bin/pumble-mcp-curated.js"),
      "--help",
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("workflow-first Pumble MCP server");
  });

  it("runs the curated entrypoint through a symlinked path", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pumble-curated-main-"));
    try {
      const linkedBin = join(tempDir, "pumble-mcp-curated.js");
      symlinkSync(join(__dirname, "../bin/pumble-mcp-curated.js"), linkedBin);

      const result = await spawnNode([linkedBin, "--help"]);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("workflow-first Pumble MCP server");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("live MCP smoke launches the generated curated JS bundle", () => {
    const source = readFileSync(join(__dirname, "../scripts/run-mcp-live.mjs"), "utf8");

    expect(source).toContain("./bin/pumble-mcp-curated.js");
    expect(source).not.toContain("./bin/pumble-mcp-curated.mjs");
  });
});
