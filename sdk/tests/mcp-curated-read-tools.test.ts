import * as z from "zod/v3";
import { describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Message } from "../src/models/message.js";
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

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: "message-1",
    channelId: "channel-1",
    workspaceId: "workspace-1",
    author: "user-1",
    authorAppId: null,
    text: "message text",
    timestamp: new Date("2026-05-22T10:00:00.000Z"),
    timestampMilli: 1779444000000,
    attachments: [{ noisy: true }],
    reactions: [{ name: "eyes", count: 1, users: ["user-2"] }],
    ...overrides,
  };
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

function jsonContent(result: CallToolResult): unknown {
  expect(result.isError).toBeUndefined();
  expect(result.content).toHaveLength(1);
  const [content] = result.content;
  expect(content?.type).toBe("text");
  const text = content?.type === "text" ? content.text : "";
  expect(text).not.toContain("attachments");
  expect(text).not.toContain("reactions");
  expect(text).not.toContain("highlightedBlocks");
  return JSON.parse(text);
}

describe("curated read workflow tools", () => {
  it("registers the read tools on the public curated profile", () => {
    const client = {
      users: { myInfo: vi.fn() },
      channels: {},
      messages: {},
    };
    const server = register(client);

    expect(CURATED_TOOL_NAMES).toEqual(expect.arrayContaining([
      "search_messages",
      "get_message",
      "list_channel_messages",
      "list_thread_replies",
      "get_thread_context",
    ]));
    expect([...server.tools.keys()]).toEqual(expect.arrayContaining([
      "search_messages",
      "get_message",
      "list_channel_messages",
      "list_thread_replies",
      "get_thread_context",
    ]));
  });

  it("searches messages with a small default limit and compact identity-rich output", async () => {
    const searchMessages = vi.fn().mockResolvedValue({
      result: {
        content: [
          {
            ...message({
              id: "hit-1",
              text: "Release is ready",
              authorAppId: "app-1",
              threadRootInfo: { replyCount: 2 },
            }),
            highlightedBlocks: [{ type: "rich_text", elements: [] }],
          },
        ],
        totalElements: 1,
        hasMore: false,
      },
    });
    const server = register({
      users: { myInfo: vi.fn() },
      channels: {},
      messages: { searchMessages },
    });

    const payload = jsonContent(await invoke(server, "search_messages", {
      text: "release",
      in: ["channel-1"],
    }));

    expect(searchMessages).toHaveBeenCalledWith({
      text: "release",
      in: ["channel-1"],
      limit: 10,
    }, undefined);
    expect(payload).toEqual({
      messages: [{
        id: "hit-1",
        text: "Release is ready",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
        actor: { id: "user-1", appId: "app-1" },
        target: { channelId: "channel-1", workspaceId: "workspace-1" },
        thread: { replyCount: 2 },
      }],
      page: { limit: 10, totalElements: 1, hasMore: false },
    });
  });

  it("fetches a single message without returning bulky generated fields", async () => {
    const fetchMessage = vi.fn().mockResolvedValue(message({
      id: "message-2",
      text: "Can you confirm this?",
      author: "user-2",
    }));
    const server = register({
      users: { myInfo: vi.fn() },
      channels: {},
      messages: { fetchMessage },
    });

    const payload = jsonContent(await invoke(server, "get_message", {
      channelId: "channel-1",
      messageId: "message-2",
    }));

    expect(fetchMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "message-2",
    }, undefined);
    expect(payload).toEqual({
      id: "message-2",
      text: "Can you confirm this?",
      timestamp: "2026-05-22T10:00:00.000Z",
      timestampMilli: 1779444000000,
      actor: { id: "user-2" },
      target: { channelId: "channel-1", workspaceId: "workspace-1" },
    });
  });

  it("lists channel messages and thread replies with bounded default page sizes", async () => {
    const listMessages = vi.fn().mockResolvedValue({
      result: {
        messages: [message({ id: "listed-1" })],
        hasMoreBefore: true,
        hasMoreAfter: null,
      },
    });
    const fetchThreadReplies = vi.fn().mockResolvedValue({
      result: [message({ id: "reply-1", author: "user-reply" })],
    });
    const server = register({
      users: { myInfo: vi.fn() },
      channels: {},
      messages: { listMessages, fetchThreadReplies },
    });

    expect(jsonContent(await invoke(server, "list_channel_messages", {
      channelId: "channel-1",
    }))).toEqual({
      messages: [{
        id: "listed-1",
        text: "message text",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
        actor: { id: "user-1" },
        target: { channelId: "channel-1", workspaceId: "workspace-1" },
      }],
      page: { limit: 10, hasMoreBefore: true, hasMoreAfter: null },
    });
    expect(listMessages).toHaveBeenCalledWith({ channelId: "channel-1", limit: 10 }, undefined);

    expect(jsonContent(await invoke(server, "list_thread_replies", {
      channelId: "channel-1",
      rootMessageId: "root-1",
    }))).toEqual({
      replies: [{
        id: "reply-1",
        text: "message text",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
        actor: { id: "user-reply" },
        target: { channelId: "channel-1", workspaceId: "workspace-1" },
      }],
      page: { limit: 10 },
    });
    expect(fetchThreadReplies).toHaveBeenCalledWith({
      channelId: "channel-1",
      rootMessageId: "root-1",
      limit: 10,
    }, undefined);
  });

  it("returns thread context through the existing extension helper with a bounded reply limit", async () => {
    const fetchMessage = vi.fn().mockResolvedValue(message({
      id: "root-1",
      text: "Root text",
      author: "user-root",
      threadRootInfo: { replyCount: 1 },
    }));
    const fetchThreadReplies = vi.fn().mockResolvedValue({
      result: [message({ id: "reply-1", text: "Reply text", author: "user-reply" })],
    });
    const server = register({
      users: { myInfo: vi.fn() },
      channels: {},
      messages: { fetchMessage, fetchThreadReplies },
    });

    const payload = jsonContent(await invoke(server, "get_thread_context", {
      channelId: "channel-1",
      messageId: "root-1",
    }));

    expect(fetchMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "root-1",
    }, undefined);
    expect(fetchThreadReplies).toHaveBeenCalledWith({
      channelId: "channel-1",
      rootMessageId: "root-1",
      limit: 10,
    }, undefined);
    expect(payload).toEqual({
      root: {
        id: "root-1",
        text: "Root text",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
        actor: { id: "user-root" },
        target: { channelId: "channel-1" },
      },
      replies: [{
        id: "reply-1",
        text: "Reply text",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
        actor: { id: "user-reply" },
        target: { channelId: "channel-1" },
      }],
      participants: ["user-root", "user-reply"],
      replyCount: 1,
      page: { replyLimit: 10 },
    });
  });

  it("rejects unbounded, non-integer, and oversized read limits before SDK calls", () => {
    const searchMessages = vi.fn();
    const listMessages = vi.fn();
    const fetchThreadReplies = vi.fn();
    const server = register({
      users: { myInfo: vi.fn() },
      channels: {},
      messages: { searchMessages, listMessages, fetchThreadReplies },
    });

    for (const [toolName, args] of [
      ["search_messages", { text: "release", limit: 0 }],
      ["list_channel_messages", { channelId: "channel-1", limit: 51 }],
      ["list_thread_replies", { channelId: "channel-1", rootMessageId: "root-1", limit: 1.5 }],
      ["get_thread_context", { channelId: "channel-1", messageId: "root-1", replyLimit: 51 }],
    ] as const) {
      const tool = server.tools.get(toolName);
      expect(tool, toolName).toBeDefined();
      expect(() => parseArgs(tool as CapturedTool, args)).toThrow();
    }

    expect(searchMessages).not.toHaveBeenCalled();
    expect(listMessages).not.toHaveBeenCalled();
    expect(fetchThreadReplies).not.toHaveBeenCalled();
  });
});
