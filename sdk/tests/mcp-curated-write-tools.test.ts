import * as z from "zod/v3";
import { describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
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

function register(client: unknown): FakeServer {
  const server = new FakeServer();
  registerCuratedTools(server as never, client as never);
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

function writeClient() {
  return {
    users: { myInfo: vi.fn() },
    channels: {},
    messages: {
      sendMessage: vi.fn().mockResolvedValue({ id: "sent-1", channelId: "channel-1" }),
      sendReply: vi.fn().mockResolvedValue({ id: "reply-1", channelId: "channel-1" }),
      addReaction: vi.fn().mockResolvedValue({ status: "ok" }),
      removeReaction: vi.fn().mockResolvedValue({ status: "ok" }),
    },
  };
}

describe("curated write workflow tools", () => {
  it("registers confirmed write and exact reaction tools without unconfirmed or destructive writes", () => {
    const server = register(writeClient());

    expect(CURATED_TOOL_NAMES).toEqual(expect.arrayContaining([
      "preview_send_message",
      "send_message_confirmed",
      "preview_reply_to_thread",
      "reply_to_thread_confirmed",
      "add_reaction",
      "remove_reaction",
    ]));
    expect([...server.tools.keys()]).toEqual(expect.arrayContaining([
      "preview_send_message",
      "send_message_confirmed",
      "preview_reply_to_thread",
      "reply_to_thread_confirmed",
      "add_reaction",
      "remove_reaction",
    ]));
    expect(server.tools.has("send_message")).toBe(false);
    expect(server.tools.has("reply_to_thread")).toBe(false);
    expect(server.tools.has("delete_message")).toBe(false);
    expect(server.tools.has("edit_message")).toBe(false);
  });

  it("rejects send without the preview payload and confirmation token before SDK calls", () => {
    const client = writeClient();
    const server = register(client);
    const tool = server.tools.get("send_message_confirmed");

    expect(tool).toBeDefined();
    expect(() => parseArgs(tool as CapturedTool, {
      request: { channelId: "channel-1", text: "ship it" },
    })).toThrow();
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("previews a send target and risk without calling the SDK", async () => {
    const client = writeClient();
    const server = register(client);

    const payload = jsonContent(await invoke(server, "preview_send_message", {
      channelId: "channel-1",
      channel: "#ops",
      text: "Ship this after approval.",
    }));

    expect(payload).toEqual({
      request: {
        channelId: "channel-1",
        channel: "#ops",
        text: "Ship this after approval.",
      },
      preview: {
        actionType: "send_message",
        targetKind: "channel",
        targetId: "channel-1",
        targetName: "#ops",
        textExcerpt: "Ship this after approval.",
        riskLevel: "medium",
      },
      confirmationToken: expect.stringMatching(/^pumble-write-plan-v1\./),
    });
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a tampered send preview before SDK calls", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "preview_send_message", {
      channelId: "channel-1",
      text: "Ship this after approval.",
    }));

    const result = await invoke(server, "send_message_confirmed", {
      request: payload.request,
      preview: {
        ...(payload.preview as Record<string, unknown>),
        targetId: "channel-2",
      },
      confirmationToken: payload.confirmationToken,
    });

    expect(errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a tampered send token before SDK calls", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "preview_send_message", {
      channelId: "channel-1",
      text: "Ship this after approval.",
    }));

    const result = await invoke(server, "send_message_confirmed", {
      request: payload.request,
      preview: payload.preview,
      confirmationToken: "pumble-write-plan-v1.not-the-right-digest",
    });

    expect(errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("confirmed send calls the generated SDK once with the exact request", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "preview_send_message", {
      channelId: "channel-1",
      text: "Ship this after approval.",
      asBot: true,
    }));

    expect(jsonContent(await invoke(server, "send_message_confirmed", payload))).toEqual({
      id: "sent-1",
      channelId: "channel-1",
    });
    expect(client.messages.sendMessage).toHaveBeenCalledTimes(1);
    expect(client.messages.sendMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      text: "Ship this after approval.",
      asBot: true,
    }, undefined);
  });

  it("confirmed thread reply verifies the preview before calling the generated SDK", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "preview_reply_to_thread", {
      channelId: "channel-1",
      messageId: "root-1",
      text: "Reply after approval.",
      alsoSendToChannel: true,
    }));

    expect(payload).toMatchObject({
      request: {
        channelId: "channel-1",
        messageId: "root-1",
        text: "Reply after approval.",
        alsoSendToChannel: true,
      },
      preview: {
        actionType: "reply_to_thread",
        targetKind: "thread",
        targetId: "channel-1/root-1",
        textExcerpt: "Reply after approval.",
        riskLevel: "medium",
      },
      confirmationToken: expect.stringMatching(/^pumble-write-plan-v1\./),
    });

    expect(jsonContent(await invoke(server, "reply_to_thread_confirmed", payload))).toEqual({
      id: "reply-1",
      channelId: "channel-1",
    });
    expect(client.messages.sendReply).toHaveBeenCalledTimes(1);
    expect(client.messages.sendReply).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "root-1",
      text: "Reply after approval.",
      alsoSendToChannel: true,
    }, undefined);
  });

  it("reaction tools require exact channel, message, and reaction identifiers", async () => {
    const client = writeClient();
    const server = register(client);
    const addReaction = server.tools.get("add_reaction");
    const removeReaction = server.tools.get("remove_reaction");

    expect(addReaction).toBeDefined();
    expect(removeReaction).toBeDefined();
    expect(() => parseArgs(addReaction as CapturedTool, {
      messageId: "message-1",
      reaction: ":eyes:",
    })).toThrow();
    expect(() => parseArgs(removeReaction as CapturedTool, {
      channelId: "channel-1",
      reaction: ":eyes:",
    })).toThrow();

    expect(jsonContent(await invoke(server, "add_reaction", {
      channelId: "channel-1",
      messageId: "message-1",
      reaction: ":eyes:",
    }))).toEqual({ status: "ok" });
    expect(jsonContent(await invoke(server, "remove_reaction", {
      channelId: "channel-1",
      messageId: "message-1",
      reaction: ":eyes:",
    }))).toEqual({ status: "ok" });
    expect(client.messages.addReaction).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "message-1",
      reaction: ":eyes:",
    }, undefined);
    expect(client.messages.removeReaction).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "message-1",
      reaction: ":eyes:",
    }, undefined);
  });
});
