import type {
  GetPromptResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod/v3";
import type { Message } from "../src/models/message.js";
import {
  CURATED_PROMPT_NAMES,
  registerCuratedPrompts,
} from "../src/mcp-server/curated/prompts.js";
import {
  CURATED_RESOURCE_NAMES,
  registerCuratedResources,
} from "../src/mcp-server/curated/resources.js";

type ResourceHandler = (
  uri: URL,
  variables: Record<string, string>,
  extra: { signal?: AbortSignal },
) => ReadResourceResult | Promise<ReadResourceResult>;

type PromptHandler = (
  args: Record<string, unknown>,
  extra: { signal?: AbortSignal },
) => GetPromptResult | Promise<GetPromptResult>;

interface CapturedResource {
  readonly name: string;
  readonly template: unknown;
  readonly config: Record<string, unknown>;
  readonly handler: ResourceHandler;
}

interface CapturedPrompt {
  readonly name: string;
  readonly config: {
    readonly description?: string;
    readonly argsSchema?: z.ZodRawShape;
  };
  readonly handler: PromptHandler;
}

class FakeServer {
  readonly prompts = new Map<string, CapturedPrompt>();
  readonly resources = new Map<string, CapturedResource>();

  registerPrompt(
    name: string,
    config: CapturedPrompt["config"],
    handler: PromptHandler,
  ): void {
    this.prompts.set(name, { name, config, handler });
  }

  registerResource(
    name: string,
    template: unknown,
    config: Record<string, unknown>,
    handler: ResourceHandler,
  ): void {
    this.resources.set(name, { name, template, config, handler });
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

function registerResources(client: unknown): FakeServer {
  const server = new FakeServer();
  registerCuratedResources(server as never, client as never);
  return server;
}

function registerPrompts(): FakeServer {
  const server = new FakeServer();
  registerCuratedPrompts(server as never);
  return server;
}

function templateUri(template: unknown): string {
  const candidate = template as {
    uriTemplate?: { toString(): string };
  };
  return candidate.uriTemplate?.toString() ?? "";
}

async function readResource(
  server: FakeServer,
  name: string,
  uri: string,
  variables: Record<string, string>,
): Promise<ReadResourceResult> {
  const resource = server.resources.get(name);
  if (resource === undefined) {
    throw new Error(`missing resource: ${name}`);
  }
  return resource.handler(new URL(uri), variables, {});
}

function jsonResource(result: ReadResourceResult): unknown {
  expect(result.contents).toHaveLength(1);
  const [content] = result.contents;
  expect(content?.mimeType).toBe("application/json");
  expect("text" in (content ?? {})).toBe(true);
  const text = "text" in (content ?? {}) ? content.text : "";
  expect(text).not.toContain("attachments");
  expect(text).not.toContain("reactions");
  expect(text).not.toContain("highlightedBlocks");
  return JSON.parse(text);
}

function parsePromptArgs(
  prompt: CapturedPrompt,
  args: Record<string, unknown>,
): Record<string, unknown> {
  return prompt.config.argsSchema === undefined
    ? args
    : z.object(prompt.config.argsSchema).parse(args);
}

async function invokePrompt(
  server: FakeServer,
  name: string,
  args: Record<string, unknown>,
): Promise<GetPromptResult> {
  const prompt = server.prompts.get(name);
  if (prompt === undefined) {
    throw new Error(`missing prompt: ${name}`);
  }
  return prompt.handler(parsePromptArgs(prompt, args), {});
}

function promptText(result: GetPromptResult): string {
  expect(result.messages).toHaveLength(1);
  const [messageResult] = result.messages;
  expect(messageResult?.role).toBe("user");
  expect(messageResult?.content.type).toBe("text");
  return messageResult?.content.type === "text" ? messageResult.content.text : "";
}

describe("curated MCP resources and prompts", () => {
  it("registers compact channel and thread resource templates", () => {
    const server = registerResources({
      messages: {
        listMessages: vi.fn(),
        fetchMessage: vi.fn(),
        fetchThreadReplies: vi.fn(),
      },
    });

    expect(CURATED_RESOURCE_NAMES).toEqual([
      "pumble_channel",
      "pumble_thread",
      "pumble_knowledge_file",
      "pumble_event",
    ]);
    expect(templateUri(server.resources.get("pumble_channel")?.template)).toBe(
      "pumble://channel/{channelId}",
    );
    expect(templateUri(server.resources.get("pumble_thread")?.template)).toBe(
      "pumble://thread/{channelId}/{messageId}",
    );
  });

  it("reads a bounded compact channel messages resource", async () => {
    const listMessages = vi.fn().mockResolvedValue({
      result: {
        messages: [message({
          id: "listed-1",
          text: "Release is ready",
          authorAppId: "app-1",
          threadRootInfo: { replyCount: 2 },
        })],
        hasMoreBefore: false,
        hasMoreAfter: true,
      },
    });
    const server = registerResources({
      messages: {
        listMessages,
        fetchMessage: vi.fn(),
        fetchThreadReplies: vi.fn(),
      },
    });

    const payload = jsonResource(await readResource(
      server,
      "pumble_channel",
      "pumble://channel/channel-1",
      { channelId: "channel-1" },
    ));

    expect(listMessages).toHaveBeenCalledWith({
      channelId: "channel-1",
      limit: 10,
    }, undefined);
    expect(payload).toEqual({
      channelId: "channel-1",
      messages: [{
        id: "listed-1",
        text: "Release is ready",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
        actor: { id: "user-1", appId: "app-1" },
        target: { channelId: "channel-1", workspaceId: "workspace-1" },
        thread: { replyCount: 2 },
      }],
      page: { limit: 10, hasMoreBefore: false, hasMoreAfter: true },
    });
  });

  it("reads a compact thread resource through existing thread-context behavior", async () => {
    const fetchMessage = vi.fn().mockResolvedValue(message({
      id: "root-1",
      text: "Root text",
      author: "user-root",
      threadRootInfo: { replyCount: 1 },
    }));
    const fetchThreadReplies = vi.fn().mockResolvedValue({
      result: [message({
        id: "reply-1",
        text: "Reply text",
        author: "user-reply",
      })],
    });
    const server = registerResources({
      messages: {
        listMessages: vi.fn(),
        fetchMessage,
        fetchThreadReplies,
      },
    });

    const payload = jsonResource(await readResource(
      server,
      "pumble_thread",
      "pumble://thread/channel-1/root-1",
      { channelId: "channel-1", messageId: "root-1" },
    ));

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
      channelId: "channel-1",
      messageId: "root-1",
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

  it("registers instruction-only prompts that route sends through write previews", async () => {
    const server = registerPrompts();

    expect(CURATED_PROMPT_NAMES).toEqual([
      "summarize_thread",
      "draft_reply",
      "write_pumble_handler",
      "debug_pumble_webhook",
    ]);
    expect([...server.prompts.keys()]).toEqual([
      "summarize_thread",
      "draft_reply",
      "write_pumble_handler",
      "debug_pumble_webhook",
    ]);

    const summary = promptText(await invokePrompt(server, "summarize_thread", {
      channelId: "channel-1",
      messageId: "root-1",
      focus: "release blockers",
    }));
    expect(summary).toContain("pumble://thread/channel-1/root-1");
    expect(summary).toContain("release blockers");
    expect(summary).toContain("Do not send");
    expect(summary).not.toContain("reply_to_thread_confirmed");
    expect(summary).not.toContain("send_message_confirmed");

    const draft = promptText(await invokePrompt(server, "draft_reply", {
      channelId: "channel-1",
      messageId: "root-1",
      replyGoal: "acknowledge and ask for ETA",
    }));
    expect(draft).toContain("pumble://thread/channel-1/root-1");
    expect(draft).toContain("acknowledge and ask for ETA");
    expect(draft).toContain("Do not send");
    expect(draft).toContain("reply_to_thread_preview");
    expect(draft).toContain("reply_to_thread_confirmed");
    expect(draft).toContain("explicit user confirmation");
  });
});
