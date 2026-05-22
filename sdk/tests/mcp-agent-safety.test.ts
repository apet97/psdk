import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import { describe, expect, it, vi } from "vitest";
import { buildMcpInvocation } from "../bin/pumble-mcp-args.mjs";
import { CURATED_TOOL_NAMES, registerCuratedTools } from "../src/mcp-server/curated/tools.js";

type CapturedHandler = (
  args: Record<string, unknown>,
  extra: { signal?: AbortSignal },
) => CallToolResult | Promise<CallToolResult>;

interface CapturedTool {
  readonly name: string;
  readonly description: string;
  readonly schema?: z.ZodRawShape;
  readonly handler: CapturedHandler;
}

interface AgentSafetyFixture {
  readonly channels: unknown[];
  readonly ambiguousChannelQuery: string;
  readonly sendRequest: Record<string, unknown>;
  readonly wrongConfirmationToken: string;
  readonly defaultArgv: string[];
  readonly rawProfileArgv: string[];
  readonly destructiveToolNames: string[];
}

class FakeServer {
  readonly tools = new Map<string, CapturedTool>();

  tool(name: string, description: string, ...rest: unknown[]): void {
    const handler = rest.at(-1);
    if (typeof handler !== "function") {
      throw new Error(`tool ${name} did not register a handler`);
    }

    const schema = rest.length === 2 ? rest[0] as z.ZodRawShape : undefined;
    this.tools.set(name, {
      name,
      description,
      schema,
      handler: handler as CapturedHandler,
    });
  }
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

function register(client = safetyClient()): FakeServer {
  const server = new FakeServer();
  registerCuratedTools(server as never, client as never, {
    confirmationSecret: "agent-safety-eval-secret",
  });
  return server;
}

function parseArgs(tool: CapturedTool, args: Record<string, unknown>): Record<string, unknown> {
  return tool.schema === undefined ? args : z.object(tool.schema).parse(args);
}

async function invoke(
  server: FakeServer,
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const tool = server.tools.get(name);
  if (tool === undefined) {
    throw new Error(`missing tool: ${name}`);
  }
  return tool.handler(parseArgs(tool, args), {});
}

function jsonContent<T = Record<string, unknown>>(result: CallToolResult): T {
  expect(result.isError).toBeUndefined();
  expect(result.content).toHaveLength(1);
  const [content] = result.content;
  expect(content?.type).toBe("text");
  return JSON.parse(content?.type === "text" ? content.text : "") as T;
}

function errorText(result: CallToolResult): string {
  expect(result.isError).toBe(true);
  expect(result.content).toHaveLength(1);
  const [content] = result.content;
  expect(content?.type).toBe("text");
  return content?.type === "text" ? content.text : "";
}

describe("MCP agent safety evals", () => {
  it("forces find_channel semantics before write previews when a channel name is ambiguous", async () => {
    const client = safetyClient();
    const server = register(client);
    const resolution = jsonContent(await invoke(server, "find_channel", {
      query: fixture.ambiguousChannelQuery,
    }));
    const previewSend = server.tools.get("send_message_preview");

    expect(resolution).toMatchObject({
      ok: false,
      data: {
        reason: "ambiguous",
        choices: [
          { id: "channel-support-eng", name: "support-eng", channelType: "PUBLIC" },
          { id: "channel-support-ops", name: "support-ops", channelType: "PRIVATE" },
        ],
      },
    });
    expect(previewSend).toBeDefined();
    const preview = await invoke(server, "send_message_preview", {
      channel: "#support",
      text: fixture.sendRequest.text,
    });
    expect(jsonContent(preview)).toMatchObject({
      ok: false,
      data: { reason: "ambiguous" },
    });
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects writes that skip the preview payload and confirmation token", () => {
    const client = safetyClient();
    const server = register(client);
    const confirmedSend = server.tools.get("send_message_confirmed");

    expect(confirmedSend).toBeDefined();
    expect(() => parseArgs(confirmedSend as CapturedTool, {
      request: fixture.sendRequest,
    })).toThrow();
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects wrong confirmation tokens before SDK writes", async () => {
    const client = safetyClient();
    const server = register(client);
    const preview = jsonContent(await invoke(server, "send_message_preview", fixture.sendRequest));

    const result = await invoke(server, "send_message_confirmed", {
      ...(preview as any).data,
      confirmationToken: fixture.wrongConfirmationToken,
    });

    expect(errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("does not expose direct reaction writes in the curated profile", () => {
    const server = register(safetyClient());

    expect(server.tools.has("add_reaction")).toBe(false);
    expect(server.tools.has("remove_reaction")).toBe(false);
    expect(CURATED_TOOL_NAMES).not.toContain("add_reaction" as never);
    expect(CURATED_TOOL_NAMES).not.toContain("remove_reaction" as never);
  });

  it("uses the curated profile by default and keeps delete/edit out of the advertised surface", () => {
    const server = register();
    const invocation = buildMcpInvocation({
      argv: fixture.defaultArgv,
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
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
      expect(server.tools.has(name)).toBe(false);
    }
  });

  it("keeps the raw generated profile available only when explicitly requested", () => {
    const invocation = buildMcpInvocation({
      argv: fixture.rawProfileArgv,
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
    });

    expect(invocation.effectiveProfile).toBe("readwrite");
    expect(invocation.nodeArgs).toEqual([
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
