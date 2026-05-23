import { execFile as execFileCallback } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");
const cliPath = join(sdkRoot, "bin/pumble-cli.mjs");
const genYamlPath = join(sdkRoot, ".speakeasy/gen.yaml");
const packageJsonPath = join(sdkRoot, "package.json");
const dryRunShim = pathToFileURL(join(sdkRoot, "bin/dry-run-shim.mjs")).href;

describe("pumble CLI", () => {
  let tempDir: string;
  let mockShimPath: string;
  let requestLogPath: string;
  let dryRunLogPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pumble-cli-test-"));
    requestLogPath = join(tempDir, "requests.jsonl");
    dryRunLogPath = join(tempDir, "dry-run.jsonl");
    mockShimPath = join(tempDir, "mock-fetch.mjs");
    writeFileSync(mockShimPath, mockFetchShimSource(requestLogPath));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("wires the npm bin through Speakeasy config and regenerated package metadata", () => {
    const gen = parseYaml(readFileSync(genYamlPath, "utf8"));
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    expect(gen.typescript.additionalPackageJSON.bin.pumble).toBe("./bin/pumble-cli.mjs");
    expect(pkg.bin.pumble).toBe("./bin/pumble-cli.mjs");
  });

  it("prints authenticated user information as JSON", async () => {
    const { stdout, stderr } = await runCli(["whoami", "--json"]);
    expect(stderr).toBe("");
    const body = JSON.parse(stdout);
    expect(body).toMatchObject({
      id: "aaaaaaaaaaaaaaaaaaaa0001",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
    expect(readRequests().at(-1)).toMatchObject({ method: "GET", path: "/myInfo" });
  });

  it("lists channels in human-readable form by default", async () => {
    const { stdout } = await runCli(["channels", "list"]);
    expect(stdout).toContain("#general");
    expect(stdout).toContain("#ops");
    expect(stdout).toContain("PUBLIC");
  });

  it("finds a channel by human name", async () => {
    const { stdout } = await runCli(["channels", "find", "general", "--json"]);
    expect(JSON.parse(stdout)).toMatchObject({
      id: "bbbbbbbbbbbbbbbbbbbb0001",
      name: "general",
      channelType: "PUBLIC",
    });
    expect(readRequests().at(-1)).toMatchObject({ method: "GET", path: "/listChannels" });
  });

  it("prints resolver candidate labels when a channel is ambiguous", async () => {
    await expect(runCli(["channels", "find", "gen"])).rejects.toMatchObject({
      stderr: expect.stringContaining("#general | PUBLIC | bbbbbbbbbbbbbbbbbbbb0001"),
    });
  });

  it("finds a user by email", async () => {
    const { stdout } = await runCli(["users", "find", "grace@example.com", "--json"]);
    expect(JSON.parse(stdout)).toMatchObject({
      id: "aaaaaaaaaaaaaaaaaaaa0002",
      email: "grace@example.com",
      name: "Grace Hopper",
    });
    expect(readRequests().at(-1)).toMatchObject({ method: "GET", path: "/listUsers" });
  });

  it("resolves channel names before dry-run sending a message", async () => {
    const { stdout } = await runCliDryRun(["send", "#general", "hello from cli"]);
    expect(stdout).toBe("");

    expect(readRequests().map((r) => r.path)).toContain("/listChannels");
    const audit = readDryRunAudit().at(-1);
    expect(audit).toMatchObject({
      method: "POST",
      path: "/sendMessage",
      requestBody: {
        channelId: "bbbbbbbbbbbbbbbbbbbb0001",
        text: "[redacted]",
      },
    });
  });

  it("resolves user email before dry-run sending a DM", async () => {
    await runCliDryRun(["dm", "grace@example.com", "ship it"]);
    expect(readRequests().map((r) => r.path)).toContain("/listUsers");
    expect(readDryRunAudit().at(-1)).toMatchObject({
      method: "POST",
      path: "/dmUser",
      requestBody: {
        userId: "aaaaaaaaaaaaaaaaaaaa0002",
        text: "[redacted]",
      },
    });
  });

  it("sets and clears custom status through dry-run requests", async () => {
    await runCliDryRun([
      "status",
      "set",
      ":coffee:",
      "Deep work",
      "--expires-at",
      "1893456000000",
    ]);
    await runCliDryRun(["status", "clear"]);

    const audit = readDryRunAudit();
    expect(audit.at(-2)).toMatchObject({
      method: "POST",
      path: "/customStatus",
      requestBody: {
        code: "[redacted]",
        status: "[redacted]",
        expiresAt: 1893456000000,
      },
    });
    expect(audit.at(-1)).toMatchObject({
      method: "POST",
      path: "/customStatus",
      requestBody: {
        code: "[redacted]",
        status: "",
      },
    });
    expect(audit.at(-1)?.requestBody.expiresAt).toBeLessThan(Date.now());
  });

  it("prints limited search results as JSON", async () => {
    const { stdout } = await runCli(["search", "deploy", "--limit", "1", "--json"]);
    const results = JSON.parse(stdout);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "cccccccccccccccccccc0001",
      text: "deploy green",
    });
    expect(readRequests().at(-1)).toMatchObject({
      method: "POST",
      path: "/searchMessages",
      body: { text: "deploy", limit: 1 },
    });
  });

  it("prints channel messages as JSON after resolving a channel name", async () => {
    const { stdout } = await runCli(["messages", "general", "--limit", "1", "--json"]);
    const messages = JSON.parse(stdout);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: "cccccccccccccccccccc1001",
      text: "hello channel",
    });
    expect(readRequests().at(-1)).toMatchObject({
      method: "GET",
      path: "/listMessages",
      query: {
        channelId: "bbbbbbbbbbbbbbbbbbbb0001",
        limit: "1",
      },
    });
  });

  it("prints thread context as JSON after resolving a channel name", async () => {
    const { stdout } = await runCli([
      "thread",
      "cccccccccccccccccccc1001",
      "--channel",
      "#general",
      "--json",
    ]);
    const context = JSON.parse(stdout);
    expect(context).toMatchObject({
      root: {
        id: "cccccccccccccccccccc1001",
        text: "thread root",
      },
      replies: [{
        id: "cccccccccccccccccccc2001",
        text: "thread reply",
      }],
    });
    expect(readRequests().map((r) => r.path)).toEqual(expect.arrayContaining([
      "/listChannels",
      "/fetchMessage",
      "/fetchThreadReplies",
    ]));
  });

  it("lists scheduled messages and dry-run cancels by id", async () => {
    const list = await runCli(["schedule", "list", "--channel", "general", "--json"]);
    expect(JSON.parse(list.stdout)).toMatchObject([
      {
        id: "dddddddddddddddddddd0001",
        channelId: "bbbbbbbbbbbbbbbbbbbb0001",
        text: "later",
      },
    ]);

    await runCliDryRun(["schedule", "cancel", "dddddddddddddddddddd0001"]);
    expect(readDryRunAudit().at(-1)).toMatchObject({
      method: "DELETE",
      path: "/deleteScheduledMessage",
    });
  });

  async function runCli(args: string[]) {
    return execFile("node", [cliPath, ...args], {
      cwd: sdkRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: `--import ${pathToFileURL(mockShimPath).href}`,
        PUMBLE_API_KEY: "test-key",
        PUMBLE_BASE_URL: "https://pumble.test",
        PUMBLE_CLI_MOCK_LOG: requestLogPath,
      },
    });
  }

  async function runCliDryRun(args: string[]) {
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

  function readRequests(): Array<Record<string, any>> {
    return readJsonl(requestLogPath);
  }

  function readDryRunAudit(): Array<Record<string, any>> {
    return readJsonl(dryRunLogPath);
  }
});

function readJsonl(path: string): Array<Record<string, any>> {
  try {
    const raw = readFileSync(path, "utf8").trim();
    if (!raw) return [];
    return raw.split("\n").map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function mockFetchShimSource(logPath: string): string {
  return `
import { appendFileSync } from "node:fs";

const logPath = ${JSON.stringify(logPath)};
const workspaceId = "aaaaaaaaaaaaaaaaaaaa0000";
const selfUser = user("aaaaaaaaaaaaaaaaaaaa0001", "ada@example.com", "Ada Lovelace");
const graceUser = user("aaaaaaaaaaaaaaaaaaaa0002", "grace@example.com", "Grace Hopper");
const general = channel("bbbbbbbbbbbbbbbbbbbb0001", "general", "PUBLIC");
const generalTeam = channel("bbbbbbbbbbbbbbbbbbbb0003", "general-team", "PRIVATE");
const ops = channel("bbbbbbbbbbbbbbbbbbbb0002", "ops", "PRIVATE");

globalThis.fetch = async function pumbleCliMockFetch(input, init) {
  const req = input instanceof Request ? new Request(input, init) : new Request(input, init);
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const path = url.pathname;
  const body = await readBody(req);
  const query = Object.fromEntries(url.searchParams.entries());
  appendFileSync(logPath, JSON.stringify({ method, path, query, body }) + "\\n");

  if (method === "GET" && path === "/myInfo") return json(selfUser);
  if (method === "GET" && path === "/listUsers") return json([selfUser, graceUser]);
  if (method === "GET" && path === "/listChannels") return json([
    { channel: general, pinnedMessages: [], users: [selfUser.id, graceUser.id] },
    { channel: generalTeam, pinnedMessages: [], users: [selfUser.id] },
    { channel: ops, pinnedMessages: [], users: [selfUser.id] },
  ]);
  if (method === "POST" && path === "/searchMessages") return json({
    content: [
      message("cccccccccccccccccccc0001", "deploy green", general.id),
      message("cccccccccccccccccccc0002", "deploy checklist", ops.id),
    ],
    totalElements: 2,
    hasMore: false,
  });
  if (method === "GET" && path === "/listMessages") return json({
    messages: [
      message("cccccccccccccccccccc1001", "hello channel", query.channelId ?? general.id),
      message("cccccccccccccccccccc1002", "second message", query.channelId ?? general.id),
    ],
    hasMoreBefore: false,
    hasMoreAfter: null,
  });
  if (method === "GET" && path === "/fetchMessage") return json(
    message(query.messageId ?? "cccccccccccccccccccc1001", "thread root", query.channelId ?? general.id)
  );
  if (method === "GET" && path === "/fetchThreadReplies") return json([
    message("cccccccccccccccccccc2001", "thread reply", query.channelId ?? general.id),
  ]);
  if (method === "GET" && path === "/fetchScheduledMessages") return json({
    scheduledMessages: [
      {
        id: "dddddddddddddddddddd0001",
        channelId: query.channelId ?? general.id,
        workspaceId,
        author: selfUser.id,
        text: "later",
        sendAt: 1893456000000,
        blocks: [],
      },
    ],
    hasMore: false,
  });

  return new Response(JSON.stringify({ message: "unexpected mock request", method, path }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
};

async function readBody(req) {
  try {
    const text = await req.clone().text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  } catch {
    return null;
  }
}

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function user(id, email, name) {
  return {
    id,
    email,
    name,
    phone: "",
    title: "",
    role: "USER",
    status: "ACTIVATED",
    workspaceId,
    customStatus: null,
    timeZoneId: "UTC",
    automaticallyTimeZone: false,
  };
}

function channel(id, name, channelType) {
  return {
    id,
    name,
    channelType,
    workspaceId,
    isArchived: false,
    isMember: true,
    isMuted: false,
  };
}

function message(id, text, channelId) {
  return {
    id,
    channelId,
    workspaceId,
    author: selfUser.id,
    authorAppId: null,
    text,
    blocks: [],
    timestamp: "2026-05-22T00:00:00.000Z",
    timestampMilli: 1779408000000,
  };
}
`;
}
