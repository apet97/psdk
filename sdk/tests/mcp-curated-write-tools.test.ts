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

function jsonContent<T = Record<string, any>>(result: CallToolResult): T {
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
    channels: {
      listChannels: vi.fn().mockResolvedValue([
        {
          channel: {
            id: "channel-1",
            name: "ops",
            channelType: "PUBLIC",
            workspaceId: "workspace-1",
          },
          pinnedMessages: [],
          users: [],
        },
      ]),
    },
    messages: {
      sendMessage: vi.fn().mockResolvedValue({ id: "sent-1", channelId: "channel-1" }),
      sendReply: vi.fn().mockResolvedValue({ id: "reply-1", channelId: "channel-1" }),
    },
  };
}

describe("curated write workflow tools", () => {
  it("registers only preview/confirmed writes on the curated profile", () => {
    const server = register(writeClient());

    expect(CURATED_TOOL_NAMES).toEqual(expect.arrayContaining([
      "send_message_preview",
      "send_message_confirmed",
      "reply_to_thread_preview",
      "reply_to_thread_confirmed",
    ]));
    expect([...server.tools.keys()]).toEqual(CURATED_TOOL_NAMES);
    expect(server.tools.has("send_message")).toBe(false);
    expect(server.tools.has("reply_to_thread")).toBe(false);
    expect(server.tools.has("delete_message")).toBe(false);
    expect(server.tools.has("add_reaction")).toBe(false);
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

  it("requires resolved channel IDs in confirmed write schemas", () => {
    const server = register(writeClient());
    const sendTool = server.tools.get("send_message_confirmed");
    const replyTool = server.tools.get("reply_to_thread_confirmed");
    const preview = {
      actionType: "send_message",
      targetKind: "channel",
      targetId: "channel-1",
      textExcerpt: "ship it",
      riskLevel: "medium",
    };

    expect(() => parseArgs(sendTool as CapturedTool, {
      request: { channel: "#ops", text: "ship it" },
      preview,
      confirmationToken: "token",
    })).toThrow();
    expect(() => parseArgs(replyTool as CapturedTool, {
      request: { channel: "#ops", messageId: "root-1", text: "ship it" },
      preview: {
        ...preview,
        actionType: "reply_to_thread",
        targetKind: "thread",
        targetId: "channel-1/root-1",
      },
      confirmationToken: "token",
    })).toThrow();
  });

  it("previews a send target by resolving channel names without calling the write SDK", async () => {
    const client = writeClient();
    const server = register(client);

    const payload = jsonContent(await invoke(server, "send_message_preview", {
      channel: "#ops",
      text: "Ship this after approval.",
    }));

    expect(payload).toMatchObject({
      ok: true,
      summary: "Preview ready to send a message to ops.",
      ids: { channelId: "channel-1" },
      data: {
        request: {
          channelId: "channel-1",
          channel: "ops",
          text: "Ship this after approval.",
        },
        preview: {
          actionType: "send_message",
          targetKind: "channel",
          targetId: "channel-1",
          targetName: "ops",
          textExcerpt: "Ship this after approval.",
          riskLevel: "medium",
        },
        confirmationToken: expect.stringMatching(/^pumble-write-plan-v1\./),
      },
      nextActions: ["Call send_message_confirmed with this request, preview, and confirmationToken."],
    });
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a tampered send preview before SDK calls", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "send_message_preview", {
      channelId: "channel-1",
      text: "Ship this after approval.",
    }));

    const result = await invoke(server, "send_message_confirmed", {
      ...(payload.data as Record<string, unknown>),
      preview: {
        ...((payload.data as any).preview as Record<string, unknown>),
        targetId: "channel-2",
      },
    });

    expect(errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("confirmed send calls the generated SDK once with the resolved request", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "send_message_preview", {
      channel: "#ops",
      text: "Ship this after approval.",
      asBot: true,
    }));

    expect(jsonContent(await invoke(server, "send_message_confirmed", payload.data))).toMatchObject({
      ok: true,
      summary: "Sent message sent-1.",
      ids: { channelId: "channel-1", messageId: "sent-1" },
      data: { id: "sent-1", channelId: "channel-1" },
    });
    expect(client.messages.sendMessage).toHaveBeenCalledTimes(1);
    expect(client.messages.sendMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      channel: "ops",
      text: "Ship this after approval.",
      asBot: true,
    }, undefined);
  });

  it("confirmed thread reply verifies the preview before calling the generated SDK", async () => {
    const client = writeClient();
    const server = register(client);
    const payload = jsonContent(await invoke(server, "reply_to_thread_preview", {
      channel: "#ops",
      messageId: "root-1",
      text: "Reply after approval.",
      alsoSendToChannel: true,
    }));

    expect(payload).toMatchObject({
      ok: true,
      ids: { channelId: "channel-1", rootMessageId: "root-1" },
      data: {
        request: {
          channelId: "channel-1",
          channel: "ops",
          messageId: "root-1",
          text: "Reply after approval.",
          alsoSendToChannel: true,
        },
        preview: {
          actionType: "reply_to_thread",
          targetKind: "thread",
          targetId: "channel-1/root-1",
          targetName: "ops",
          textExcerpt: "Reply after approval.",
          riskLevel: "medium",
        },
        confirmationToken: expect.stringMatching(/^pumble-write-plan-v1\./),
      },
    });

    expect(jsonContent(await invoke(server, "reply_to_thread_confirmed", payload.data))).toMatchObject({
      ok: true,
      summary: "Sent reply reply-1.",
      ids: {
        channelId: "channel-1",
        messageId: "reply-1",
        rootMessageId: "root-1",
      },
      data: { id: "reply-1", channelId: "channel-1" },
    });
    expect(client.messages.sendReply).toHaveBeenCalledTimes(1);
    expect(client.messages.sendReply).toHaveBeenCalledWith({
      channelId: "channel-1",
      channel: "ops",
      messageId: "root-1",
      text: "Reply after approval.",
      alsoSendToChannel: true,
    }, undefined);
  });
});
