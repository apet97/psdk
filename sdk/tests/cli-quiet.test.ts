import { execFile as execFileCallback } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");
const cliPath = join(sdkRoot, "bin", "pumble-cli.mjs");
const dryRunShim = pathToFileURL(join(sdkRoot, "bin", "dry-run-shim.mjs")).href;

describe("cli write output", () => {
  let tempDir: string;
  let mockShimPath: string;
  let requestLogPath: string;
  let dryRunLogPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pumble-cli-quiet-"));
    requestLogPath = join(tempDir, "requests.jsonl");
    dryRunLogPath = join(tempDir, "dry-run.jsonl");
    mockShimPath = join(tempDir, "mock-fetch.mjs");
    writeFileSync(mockShimPath, mockFetchShim(requestLogPath));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("default prints a one-line success message for send", async () => {
    const { stdout } = await runCli(["send", "#general", "hi"]);
    expect(stdout).toMatch(/^sent /);
  });

  it("--quiet suppresses the default success line", async () => {
    const { stdout } = await runCli(["send", "#general", "hi", "--quiet"]);
    expect(stdout).toBe("");
  });

  it("--json still emits structured output", async () => {
    const { stdout } = await runCli(["send", "#general", "hi", "--json"]);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  async function runCli(args: string[]) {
    return execFile("node", [cliPath, ...args], {
      cwd: sdkRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: `--import ${pathToFileURL(mockShimPath).href} --import ${dryRunShim}`,
        PUMBLE_API_KEY: "test-key",
        PUMBLE_BASE_URL: "https://pumble.test",
        PUMBLE_CLI_MOCK_LOG: requestLogPath,
        PUMBLE_DRY_RUN: "1",
        PUMBLE_DRY_RUN_LOG: dryRunLogPath,
      },
    });
  }
});

function mockFetchShim(_logPath: string): string {
  return `
const realFetch = globalThis.fetch?.bind(globalThis);

globalThis.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET" && url.endsWith("/listChannels")) {
    return new Response(JSON.stringify([
      {
        channel: {
          id: "bbbbbbbbbbbbbbbbbbbb0001",
          name: "general",
          channelType: "PUBLIC",
        },
        isMember: true,
        isMuted: false,
      },
    ]), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
};
`;
}
