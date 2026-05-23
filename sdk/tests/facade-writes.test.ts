import { describe, expect, it, vi } from "vitest";
import type { SearchHit } from "../src/models/search-hit.js";
import { createFacadeWrites } from "../src/extensions/facade-writes.js";
import type {
  ChannelSummary,
  FacadeFailure,
  UserSummary,
} from "../src/extensions/index.js";
import {
  channelFixture,
  messageRefFixture,
  userFixture,
} from "./helpers/fixtures.js";

function searchHitFixture(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    id: "message-1",
    channelId: "channel-1",
    workspaceId: "workspace-1",
    author: "user-1",
    text: "hello",
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
    timestampMilli: 1767225600000,
    ...overrides,
  };
}

function createRawMessages() {
  return {
    messages: {
      sendMessage: vi.fn(),
      dmUser: vi.fn(),
      sendReply: vi.fn(),
      searchMessages: vi.fn(),
    },
  };
}

const channelSummary: ChannelSummary = {
  id: "channel-1",
  name: "general",
  channelType: "PUBLIC",
};

const userSummary: UserSummary = {
  id: "user-1",
  email: "user@example.invalid",
  name: "Example User",
};

const channelNotFound: FacadeFailure<ChannelSummary> = {
  ok: false,
  reason: "not_found",
  summary: "Channel not found.",
  choices: [],
  nextActions: ["Check the channel."],
};

describe("createFacadeWrites", () => {
  it("send resolves channel targets before calling generated sendMessage", async () => {
    const raw = createRawMessages();
    raw.messages.sendMessage.mockResolvedValue(messageRefFixture());
    const resolveFacadeChannel = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: "channel-1" },
      channel: channelSummary,
    });
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.sendFacadeMessage({
      channel: "#general",
      text: "hello",
    })).resolves.toEqual({
      ok: true,
      summary: "Sent message message-1 to #general.",
      ids: { channelId: "channel-1", messageId: "message-1" },
      channel: channelSummary,
      message: messageRefFixture(),
    });
    expect(resolveFacadeChannel).toHaveBeenCalledWith("#general");
    expect(raw.messages.sendMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      text: "hello",
    }, undefined);
  });

  it("dm resolves user targets before calling generated dmUser", async () => {
    const raw = createRawMessages();
    raw.messages.dmUser.mockResolvedValue(messageRefFixture({
      id: "dm-message-1",
      channelId: "dm-channel-1",
    }));
    const resolveFacadeUser = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found user Example User.",
      ids: { userId: "user-1" },
      user: userSummary,
    });
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser,
    });

    await expect(writes.dmFacadeUser({
      user: "user@example.invalid",
      text: "hello dm",
    })).resolves.toEqual({
      ok: true,
      summary: "Sent DM dm-message-1 to Example User.",
      ids: {
        userId: "user-1",
        messageId: "dm-message-1",
        channelId: "dm-channel-1",
      },
      user: userSummary,
      message: { id: "dm-message-1", channelId: "dm-channel-1" },
    });
    expect(resolveFacadeUser).toHaveBeenCalledWith("user@example.invalid");
    expect(raw.messages.dmUser).toHaveBeenCalledWith({
      userId: "user-1",
      text: "hello dm",
    }, undefined);
  });

  it("thread replies resolve channel targets before calling generated sendReply", async () => {
    const raw = createRawMessages();
    raw.messages.sendReply.mockResolvedValue(messageRefFixture({
      id: "reply-1",
      channelId: "channel-1",
    }));
    const resolveFacadeChannel = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: "channel-1" },
      channel: channelSummary,
    });
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.replyFacadeThread({
      channelId: "channel-1",
      messageId: "root-1",
      text: "thread reply",
    })).resolves.toEqual({
      ok: true,
      summary: "Replied with reply-1 in #general.",
      ids: {
        channelId: "channel-1",
        messageId: "reply-1",
        rootMessageId: "root-1",
      },
      channel: channelSummary,
      message: { id: "reply-1", channelId: "channel-1" },
    });
    expect(resolveFacadeChannel).toHaveBeenCalledWith("channel-1");
    expect(raw.messages.sendReply).toHaveBeenCalledWith({
      channelId: "channel-1",
      messageId: "root-1",
      text: "thread reply",
    }, undefined);
  });

  it("search recent preserves default and explicit limits in generated search requests", async () => {
    const raw = createRawMessages();
    const hits = [
      searchHitFixture({ id: "m1", channelId: "c1" }),
      searchHitFixture({ id: "m2", channelId: "c1" }),
      searchHitFixture({ id: "m3", channelId: "c2" }),
    ];
    raw.messages.searchMessages.mockResolvedValue({
      result: { content: hits, totalElements: hits.length, hasMore: false },
    });
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.searchRecent({ query: "deploy" })).resolves.toEqual({
      ok: true,
      summary: "Found 3 recent messages for \"deploy\".",
      ids: { messageIds: ["m1", "m2", "m3"], channelIds: ["c1", "c2"] },
      data: hits,
    });
    expect(raw.messages.searchMessages).toHaveBeenLastCalledWith({
      text: "deploy",
      limit: 10,
      strategy: "MOST_RECENT",
    }, undefined);

    raw.messages.searchMessages.mockResolvedValueOnce({
      result: { content: hits, totalElements: hits.length, hasMore: false },
    });
    await expect(writes.searchRecent({ query: "deploy", limit: 2 }))
      .resolves.toMatchObject({
        ids: { messageIds: ["m1", "m2"], channelIds: ["c1"] },
        data: hits.slice(0, 2),
      });
    expect(raw.messages.searchMessages).toHaveBeenLastCalledWith({
      text: "deploy",
      limit: 2,
      strategy: "MOST_RECENT",
    }, undefined);
  });

  it("returns facade failure values from channel resolution without writing", async () => {
    const raw = createRawMessages();
    const resolveFacadeChannel = vi.fn().mockResolvedValue(channelNotFound);
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.sendFacadeMessage({
      channel: "missing",
      text: "do not send",
    })).resolves.toBe(channelNotFound);
    await expect(writes.replyFacadeThread({
      channel: "missing",
      messageId: "root-1",
      text: "do not send",
    })).resolves.toBe(channelNotFound);
    expect(raw.messages.sendMessage).not.toHaveBeenCalled();
    expect(raw.messages.sendReply).not.toHaveBeenCalled();
  });

  it("returns facade failure values from user resolution without sending DMs", async () => {
    const raw = createRawMessages();
    const userAmbiguous: FacadeFailure<UserSummary> = {
      ok: false,
      reason: "ambiguous",
      summary: "User is ambiguous.",
      choices: [userSummary],
      nextActions: ["Use a user id."],
    };
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser: vi.fn().mockResolvedValue(userAmbiguous),
    });

    await expect(writes.dmFacadeUser({
      user: "Example",
      text: "do not dm",
    })).resolves.toBe(userAmbiguous);
    expect(raw.messages.dmUser).not.toHaveBeenCalled();
  });

  it("accepts typed fixture summaries without widening generated fixtures", () => {
    expect(channelFixture(channelSummary).id).toBe("channel-1");
    expect(userFixture(userSummary).id).toBe("user-1");
  });
});
