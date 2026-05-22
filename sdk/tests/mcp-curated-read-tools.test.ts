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

const generalChannel = {
  id: "channel-1",
  name: "general",
  channelType: "PUBLIC",
  workspaceId: "workspace-1",
  isMember: true,
  isArchived: false,
};

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

function jsonContent(result: CallToolResult): any {
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

function readClient(overrides: Record<string, unknown> = {}) {
  return {
    users: { myInfo: vi.fn() },
    channels: {
      listChannels: vi.fn().mockResolvedValue([
        { channel: generalChannel, pinnedMessages: [], users: ["user-1"] },
      ]),
    },
    messages: {
      searchMessages: vi.fn(),
      listMessages: vi.fn(),
      fetchMessage: vi.fn(),
      fetchThreadReplies: vi.fn(),
      ...overrides,
    },
  };
}

describe("curated read workflow tools", () => {
  it("registers the task-oriented curated profile without old raw-style names", () => {
    const server = register(readClient());

    expect(CURATED_TOOL_NAMES).toEqual([
      "whoami",
      "find_channel",
      "find_user",
      "list_channels",
      "search_messages",
      "get_channel_context",
      "get_thread_context",
      "send_message_preview",
      "send_message_confirmed",
      "reply_to_thread_preview",
      "reply_to_thread_confirmed",
    ]);
    expect([...server.tools.keys()]).toEqual(CURATED_TOOL_NAMES);
    expect(server.tools.has("messages-send-message")).toBe(false);
    expect(server.tools.has("get_message")).toBe(false);
    expect(server.tools.has("list_thread_replies")).toBe(false);
  });

  it("lists channels in a clean MCP envelope", async () => {
    const server = register(readClient());

    const payload = jsonContent(await invoke(server, "list_channels", {}));

    expect(payload).toEqual({
      ok: true,
      summary: "Found 1 channel.",
      ids: { channelIds: ["channel-1"] },
      data: {
        channels: [{
          id: "channel-1",
          name: "general",
          channelType: "PUBLIC",
          isMember: true,
          isArchived: false,
        }],
        page: { limit: 10, totalReturned: 1 },
      },
      nextActions: [],
    });
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
    const server = register(readClient({ searchMessages }));

    const payload = jsonContent(await invoke(server, "search_messages", {
      text: "release",
      in: ["channel-1"],
    }));

    expect(searchMessages).toHaveBeenCalledWith({
      text: "release",
      in: ["channel-1"],
      limit: 10,
    }, undefined);
    expect(payload).toMatchObject({
      ok: true,
      summary: "Found 1 message.",
      ids: { messageIds: ["hit-1"], channelIds: ["channel-1"] },
      data: {
        messages: [{
          id: "hit-1",
          text: "Release is ready",
          actor: { id: "user-1", appId: "app-1" },
          target: { channelId: "channel-1", workspaceId: "workspace-1" },
          thread: { replyCount: 2 },
        }],
        page: { limit: 10, totalElements: 1, hasMore: false },
      },
    });
  });

  it("gets channel context by resolving a human channel name first", async () => {
    const listMessages = vi.fn().mockResolvedValue({
      result: {
        messages: [message({ id: "listed-1" })],
        hasMoreBefore: true,
        hasMoreAfter: null,
      },
    });
    const server = register(readClient({ listMessages }));

    const payload = jsonContent(await invoke(server, "get_channel_context", {
      channel: "#general",
    }));

    expect(listMessages).toHaveBeenCalledWith({ channelId: "channel-1", limit: 10 }, undefined);
    expect(payload).toMatchObject({
      ok: true,
      summary: "Loaded 1 message from #general.",
      ids: { channelId: "channel-1", messageIds: ["listed-1"] },
      data: {
        channel: { id: "channel-1", name: "general" },
        page: { limit: 10, hasMoreBefore: true, hasMoreAfter: null },
      },
      nextActions: ["Use get_thread_context with a message id to inspect a thread."],
    });
  });

  it("returns thread context through the existing extension helper after channel resolution", async () => {
    const fetchMessage = vi.fn().mockResolvedValue(message({
      id: "root-1",
      text: "Root text",
      author: "user-root",
      threadRootInfo: { replyCount: 1 },
    }));
    const fetchThreadReplies = vi.fn().mockResolvedValue({
      result: [message({ id: "reply-1", text: "Reply text", author: "user-reply" })],
    });
    const server = register(readClient({ fetchMessage, fetchThreadReplies }));

    const payload = jsonContent(await invoke(server, "get_thread_context", {
      channel: "#general",
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
    expect(payload).toMatchObject({
      ok: true,
      summary: "Loaded thread root-1 with 1 reply.",
      ids: {
        channelId: "channel-1",
        rootMessageId: "root-1",
        replyMessageIds: ["reply-1"],
      },
      data: {
        participants: ["user-root", "user-reply"],
        replyCount: 1,
        page: { replyLimit: 10 },
      },
    });
  });

  it("rejects unbounded, non-integer, and oversized read limits before SDK calls", () => {
    const searchMessages = vi.fn();
    const listMessages = vi.fn();
    const fetchThreadReplies = vi.fn();
    const server = register(readClient({ searchMessages, listMessages, fetchThreadReplies }));

    for (const [toolName, args] of [
      ["search_messages", { text: "release", limit: 0 }],
      ["list_channels", { limit: 51 }],
      ["get_channel_context", { channelId: "channel-1", limit: 51 }],
      ["get_thread_context", { channelId: "channel-1", messageId: "root-1", replyLimit: 1.5 }],
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
