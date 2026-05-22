import { describe, expect, it, vi } from "vitest";
import type { Message } from "../src/models/message.js";
import type { FetchThreadRepliesResponse } from "../src/models/operations/fetch-thread-replies.js";
import { createPumbleClient } from "../src/extensions/client.js";
import { getThreadContext, replyToThread } from "../src/extensions/thread-context.js";

function message(overrides: Partial<Message>): Message {
  return {
    id: "message-id",
    channelId: "channel-id",
    workspaceId: "workspace-id",
    author: "author-id",
    text: "message text",
    timestamp: new Date("2026-05-22T10:00:00.000Z"),
    timestampMilli: 1779444000000,
    ...overrides,
  };
}

function repliesPage(messages: Message[]): FetchThreadRepliesResponse {
  return { result: messages };
}

describe("getThreadContext", () => {
  it("returns a compact root/replies shape and extracts unique participants", async () => {
    const root = message({
      id: "root-1",
      channelId: "channel-1",
      author: "user-root",
      text: "Root message text stays verbatim.",
      threadRootInfo: {
        replyCount: 3,
        lastReplyTimestampMilli: 1779444060000,
      },
      attachments: [{ noisy: true }],
      files: [{ noisy: true }],
      reactions: [{ name: "wave", count: 2, users: ["user-reply-a"] }],
    });
    const replyA = message({
      id: "reply-1",
      channelId: "channel-1",
      author: "user-reply-a",
      text: "First reply text.",
      timestamp: new Date("2026-05-22T10:01:00.000Z"),
      timestampMilli: 1779444060000,
      threadReplyInfo: { rootId: "root-1", replySentToChannel: false },
    });
    const replyB = message({
      id: "reply-2",
      channelId: "channel-1",
      author: "user-root",
      text: "Root author replying again.",
      timestamp: new Date("2026-05-22T10:02:00.000Z"),
      timestampMilli: 1779444120000,
    });

    const client = {
      messages: {
        fetchMessage: vi.fn().mockResolvedValue(root),
        fetchThreadReplies: vi.fn().mockResolvedValue(repliesPage([replyA, replyB])),
        sendReply: vi.fn(),
      },
    };

    const context = await getThreadContext(
      client,
      { channelId: "channel-1", messageId: "root-1", replyLimit: 2 },
    );

    expect(client.messages.fetchMessage).toHaveBeenCalledWith(
      { channelId: "channel-1", messageId: "root-1" },
      undefined,
    );
    expect(client.messages.fetchThreadReplies).toHaveBeenCalledWith(
      { channelId: "channel-1", rootMessageId: "root-1", limit: 2 },
      undefined,
    );
    expect(context).toEqual({
      root: {
        id: "root-1",
        channelId: "channel-1",
        author: "user-root",
        text: "Root message text stays verbatim.",
        timestamp: "2026-05-22T10:00:00.000Z",
        timestampMilli: 1779444000000,
      },
      replies: [
        {
          id: "reply-1",
          channelId: "channel-1",
          author: "user-reply-a",
          text: "First reply text.",
          timestamp: "2026-05-22T10:01:00.000Z",
          timestampMilli: 1779444060000,
        },
        {
          id: "reply-2",
          channelId: "channel-1",
          author: "user-root",
          text: "Root author replying again.",
          timestamp: "2026-05-22T10:02:00.000Z",
          timestampMilli: 1779444120000,
        },
      ],
      participants: ["user-root", "user-reply-a"],
      replyCount: 3,
    });
    expect(context.root).not.toHaveProperty("attachments");
    expect(context.root).not.toHaveProperty("reactions");
  });

  it("falls back to the fetched reply length when root metadata has no reply count", async () => {
    const client = {
      messages: {
        fetchMessage: vi.fn().mockResolvedValue(message({ id: "root-2" })),
        fetchThreadReplies: vi.fn().mockResolvedValue(repliesPage([
          message({ id: "reply-a", author: "user-a" }),
          message({ id: "reply-b", author: "user-b" }),
        ])),
        sendReply: vi.fn(),
      },
    };

    await expect(getThreadContext(
      client,
      { channelId: "channel-id", messageId: "root-2" },
    )).resolves.toMatchObject({
      participants: ["author-id", "user-a", "user-b"],
      replyCount: 2,
    });
  });

  it("is wired onto createPumbleClient under threads.getContext", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const fetchMessage = vi.spyOn(client.raw.messages, "fetchMessage")
      .mockResolvedValue(message({ id: "root-3" }));
    const fetchThreadReplies = vi.spyOn(client.raw.messages, "fetchThreadReplies")
      .mockResolvedValue(repliesPage([message({ id: "reply-c" })]) as any);

    await expect(client.threads.getContext({
      channelId: "channel-id",
      messageId: "root-3",
    })).resolves.toMatchObject({
      root: { id: "root-3" },
      replies: [{ id: "reply-c" }],
      replyCount: 1,
    });

    expect(fetchMessage).toHaveBeenCalledOnce();
    expect(fetchThreadReplies).toHaveBeenCalledOnce();
  });
});

describe("replyToThread", () => {
  it("delegates to generated sendReply after requiring explicit thread ids", async () => {
    const sent = { id: "reply-3", channelId: "channel-1" };
    const client = {
      messages: {
        fetchMessage: vi.fn(),
        fetchThreadReplies: vi.fn(),
        sendReply: vi.fn().mockResolvedValue(sent),
      },
    };

    await expect(replyToThread(client, {
      channelId: "channel-1",
      messageId: "root-1",
      text: "Reply body",
      alsoSendToChannel: true,
    })).resolves.toBe(sent);

    expect(client.messages.sendReply).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "root-1",
      text: "Reply body",
      alsoSendToChannel: true,
    }, undefined);
  });

  it("rejects blank reply text before calling the generated client", async () => {
    const client = {
      messages: {
        fetchMessage: vi.fn(),
        fetchThreadReplies: vi.fn(),
        sendReply: vi.fn(),
      },
    };

    await expect(replyToThread(client, {
      channelId: "channel-1",
      messageId: "root-1",
      text: "   ",
    })).rejects.toThrow("replyToThread: text is required");
    expect(client.messages.sendReply).not.toHaveBeenCalled();
  });
});
