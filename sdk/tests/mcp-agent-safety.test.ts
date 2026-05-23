import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { buildMcpInvocation } from "../bin/pumble-mcp-args.mjs";
import { CURATED_TOOL_NAMES } from "../src/mcp-server/curated/tools.js";
import { registerCuratedHarness } from "./helpers/curated-mcp.js";

interface AgentSafetyFixture {
  readonly channels: unknown[];
  readonly ambiguousChannelQuery: string;
  readonly sendRequest: Record<string, unknown>;
  readonly wrongConfirmationToken: string;
  readonly defaultArgv: string[];
  readonly rawProfileArgv: string[];
  readonly destructiveToolNames: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "mcp-agent-safety.json"), "utf8"),
) as AgentSafetyFixture;

function safetyClient() {
  return {
    users: { myInfo: vi.fn() },
    channels: {
      listChannels: vi.fn().mockResolvedValue(fixture.channels),
    },
    messages: {
      sendMessage: vi.fn().mockResolvedValue({
        id: "sent-1",
        channelId: fixture.sendRequest.channelId,
      }),
      sendReply: vi.fn(),
      addReaction: vi.fn().mockResolvedValue({ status: "ok" }),
      removeReaction: vi.fn().mockResolvedValue({ status: "ok" }),
    },
  };
}

function register(client = safetyClient()) {
  return registerCuratedHarness(client, {
    confirmationSecret: "agent-safety-eval-secret",
  });
}

describe("MCP agent safety evals", () => {
  it("forces find_channel semantics before write previews when a channel name is ambiguous", async () => {
    const client = safetyClient();
    const harness = register(client);
    const resolution = harness.json(await harness.invoke("find_channel", {
      query: fixture.ambiguousChannelQuery,
    }));
    const previewSend = harness.tool("send_message_preview");

    expect(resolution).toMatchObject({
      ok: false,
      data: {
        reason: "ambiguous",
        choices: [
          {
            id: "channel-support-eng",
            name: "support-eng",
            channelType: "PUBLIC",
            label: "#support-eng | PUBLIC | channel-support-eng",
          },
          {
            id: "channel-support-ops",
            name: "support-ops",
            channelType: "PRIVATE",
            label: "#support-ops | PRIVATE | channel-support-ops",
          },
        ],
      },
    });
    expect(previewSend).toBeDefined();
    const preview = await harness.invoke("send_message_preview", {
      channel: "#support",
      text: fixture.sendRequest.text,
    });
    expect(harness.json(preview)).toMatchObject({
      ok: false,
      data: { reason: "ambiguous" },
    });
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects writes that skip the preview payload and confirmation token", () => {
    const client = safetyClient();
    const harness = register(client);

    expect(harness.tool("send_message_confirmed")).toBeDefined();
    expect(() => harness.parseArgs("send_message_confirmed", {
      request: fixture.sendRequest,
    })).toThrow();
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects wrong confirmation tokens before SDK writes", async () => {
    const client = safetyClient();
    const harness = register(client);
    const preview = harness.json<{ data: Record<string, unknown> }>(
      await harness.invoke("send_message_preview", fixture.sendRequest),
    );

    const result = await harness.invoke("send_message_confirmed", {
      ...preview.data,
      confirmationToken: fixture.wrongConfirmationToken,
    });

    expect(harness.errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("does not expose direct reaction writes in the curated profile", () => {
    const harness = register(safetyClient());

    expect(harness.tools.has("add_reaction")).toBe(false);
    expect(harness.tools.has("remove_reaction")).toBe(false);
    expect(CURATED_TOOL_NAMES).not.toContain("add_reaction" as never);
    expect(CURATED_TOOL_NAMES).not.toContain("remove_reaction" as never);
  });

  it("uses the curated profile by default and keeps delete/edit out of the advertised surface", () => {
    const harness = register();
    const invocation = buildMcpInvocation({
      argv: fixture.defaultArgv,
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
      auditLogShimUrl: "file:///tmp/audit-log-shim.mjs",
    });

    expect(invocation.effectiveProfile).toBe("curated");
    expect(invocation.nodeArgs).toEqual([
      "/tmp/pumble-mcp-curated.js",
      "start",
      "--transport",
      "stdio",
    ]);
    expect(invocation.args).not.toContain("--tool");
    expect(invocation.tools).toEqual([]);
    for (const name of fixture.destructiveToolNames) {
      expect(CURATED_TOOL_NAMES).not.toContain(name);
      expect(harness.tools.has(name)).toBe(false);
    }
  });

  it("keeps curated SSE on localhost with bearer auth when requested", () => {
    const invocation = buildMcpInvocation({
      argv: [
        "start",
        "--transport",
        "sse",
        "--host",
        "127.0.0.1",
        "--auth-token",
        "test-token",
      ],
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
    });

    expect(invocation.effectiveProfile).toBe("curated");
    expect(invocation.nodeArgs).toEqual([
      "/tmp/pumble-mcp-curated.js",
      "start",
      "--transport",
      "sse",
      "--host",
      "127.0.0.1",
      "--auth-token",
      "test-token",
    ]);
    expect(invocation.args).not.toContain("--tool");
  });

  it("keeps the raw generated profile available only when explicitly requested", () => {
    const invocation = buildMcpInvocation({
      argv: fixture.rawProfileArgv,
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
      auditLogShimUrl: "file:///tmp/audit-log-shim.mjs",
    });

    expect(invocation.effectiveProfile).toBe("readwrite");
    expect(invocation.nodeArgs).toEqual([
      "--import",
      "file:///tmp/audit-log-shim.mjs",
      "/tmp/raw-mcp-server.js",
      "start",
      "--transport",
      "stdio",
      ...invocation.tools.flatMap((tool) => ["--tool", tool]),
    ]);
    expect(invocation.tools).toEqual(expect.arrayContaining([
      "messages-delete-message",
      "messages-edit-message",
    ]));
  });
});
