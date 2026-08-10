import { describe, expect, it, vi } from "vitest";
import type { SearchHit } from "../src/models/search-hit.js";
import { createFacadeWrites } from "../src/extensions/facade-writes.js";
import { PumbleSDKError } from "../src/models/errors/pumble-sdk-error.js";
import type {
  ChannelId,
  ChannelSummary,
  FacadeFailure,
  UserId,
  UserSummary,
} from "../src/extensions/index.js";
import {
  asChannelId,
  asMessageId,
  asUserId,
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

function apiError(status: number): PumbleSDKError {
  return new PumbleSDKError(`HTTP ${status}`, {
    response: new Response("{}", { status }),
    request: new Request("https://example.com/pumble"),
    body: "{}",
  });
}

const CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0101");
const USER_ID = asUserId("aaaaaaaaaaaaaaaaaaaa0101");
const MESSAGE_ID = asMessageId("cccccccccccccccccccc0101");
const DM_MESSAGE_ID = asMessageId("cccccccccccccccccccc0102");
const DM_CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0102");
const REPLY_MESSAGE_ID = asMessageId("cccccccccccccccccccc0103");
const ROOT_MESSAGE_ID = asMessageId("cccccccccccccccccccc0104");

const channelSummary: ChannelSummary = {
  id: CHANNEL_ID,
  name: "general",
  channelType: "PUBLIC",
};

const userSummary: UserSummary = {
  id: USER_ID,
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
    raw.messages.sendMessage.mockResolvedValue(messageRefFixture({
      id: MESSAGE_ID,
      channelId: CHANNEL_ID,
    }));
    const resolveFacadeChannel = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: CHANNEL_ID },
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
      summary: `Sent message ${MESSAGE_ID} to #general.`,
      ids: { channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      channel: channelSummary,
      message: messageRefFixture({ id: MESSAGE_ID, channelId: CHANNEL_ID }),
    });
    expect(resolveFacadeChannel).toHaveBeenCalledWith("#general");
    expect(raw.messages.sendMessage).toHaveBeenCalledWith({
      channelId: CHANNEL_ID,
      text: "hello",
    }, undefined);
  });

  it("send uses exact channel IDs without resolving by default", async () => {
    const raw = createRawMessages();
    raw.messages.sendMessage.mockResolvedValue(messageRefFixture({
      id: MESSAGE_ID,
      channelId: CHANNEL_ID,
    }));
    const resolveFacadeChannel = vi.fn();
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.sendFacadeMessage({
      channelId: CHANNEL_ID,
      text: "hello",
    })).resolves.toMatchObject({
      ok: true,
      summary: `Sent message ${MESSAGE_ID} to channel ${CHANNEL_ID}.`,
      ids: { channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      message: { id: MESSAGE_ID, channelId: CHANNEL_ID },
    });
    expect(resolveFacadeChannel).not.toHaveBeenCalled();
    expect(raw.messages.sendMessage).toHaveBeenCalledWith({
      channelId: CHANNEL_ID,
      text: "hello",
    }, undefined);
  });

  it("dm resolves user targets before calling generated dmUser", async () => {
    const raw = createRawMessages();
    raw.messages.dmUser.mockResolvedValue(messageRefFixture({
      id: DM_MESSAGE_ID,
      channelId: DM_CHANNEL_ID,
    }));
    const resolveFacadeUser = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found user Example User.",
      ids: { userId: USER_ID },
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
      summary: `Sent DM ${DM_MESSAGE_ID} to Example User.`,
      ids: {
        userId: USER_ID,
        messageId: DM_MESSAGE_ID,
        channelId: DM_CHANNEL_ID,
      },
      user: userSummary,
      message: { id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID },
    });
    expect(resolveFacadeUser).toHaveBeenCalledWith("user@example.invalid");
    expect(raw.messages.dmUser).toHaveBeenCalledWith({
      userId: USER_ID,
      text: "hello dm",
    }, undefined);
  });

  it("dm uses exact user IDs without resolving by default", async () => {
    const raw = createRawMessages();
    raw.messages.dmUser.mockResolvedValue(messageRefFixture({
      id: DM_MESSAGE_ID,
      channelId: DM_CHANNEL_ID,
    }));
    const resolveFacadeUser = vi.fn();
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser,
    });

    await expect(writes.dmFacadeUser({
      userId: USER_ID,
      text: "hello dm",
    })).resolves.toMatchObject({
      ok: true,
      summary: `Sent DM ${DM_MESSAGE_ID} to user ${USER_ID}.`,
      ids: {
        userId: USER_ID,
        messageId: DM_MESSAGE_ID,
        channelId: DM_CHANNEL_ID,
      },
      message: { id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID },
    });
    expect(resolveFacadeUser).not.toHaveBeenCalled();
    expect(raw.messages.dmUser).toHaveBeenCalledWith({
      userId: USER_ID,
      text: "hello dm",
    }, undefined);
  });

  it("thread replies resolve channel targets before calling generated sendReply", async () => {
    const raw = createRawMessages();
    raw.messages.sendReply.mockResolvedValue(messageRefFixture({
      id: REPLY_MESSAGE_ID,
      channelId: CHANNEL_ID,
    }));
    const resolveFacadeChannel = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: CHANNEL_ID },
      channel: channelSummary,
    });
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.replyFacadeThread({
      channel: "#general",
      messageId: ROOT_MESSAGE_ID,
      text: "thread reply",
    })).resolves.toEqual({
      ok: true,
      summary: `Replied with ${REPLY_MESSAGE_ID} in #general.`,
      ids: {
        channelId: CHANNEL_ID,
        messageId: REPLY_MESSAGE_ID,
        rootMessageId: ROOT_MESSAGE_ID,
      },
      channel: channelSummary,
      message: { id: REPLY_MESSAGE_ID, channelId: CHANNEL_ID },
    });
    expect(resolveFacadeChannel).toHaveBeenCalledWith("#general");
    expect(raw.messages.sendReply).toHaveBeenCalledWith({
      channelId: CHANNEL_ID,
      messageId: ROOT_MESSAGE_ID,
      text: "thread reply",
    }, undefined);
  });

  it("thread replies use exact channel IDs without resolving by default", async () => {
    const raw = createRawMessages();
    raw.messages.sendReply.mockResolvedValue(messageRefFixture({
      id: REPLY_MESSAGE_ID,
      channelId: CHANNEL_ID,
    }));
    const resolveFacadeChannel = vi.fn();
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.replyFacadeThread({
      channelId: CHANNEL_ID,
      messageId: ROOT_MESSAGE_ID,
      text: "thread reply",
    })).resolves.toMatchObject({
      ok: true,
      summary: `Replied with ${REPLY_MESSAGE_ID} in channel ${CHANNEL_ID}.`,
      ids: {
        channelId: CHANNEL_ID,
        messageId: REPLY_MESSAGE_ID,
        rootMessageId: ROOT_MESSAGE_ID,
      },
      message: { id: REPLY_MESSAGE_ID, channelId: CHANNEL_ID },
    });
    expect(resolveFacadeChannel).not.toHaveBeenCalled();
    expect(raw.messages.sendReply).toHaveBeenCalledWith({
      channelId: CHANNEL_ID,
      messageId: ROOT_MESSAGE_ID,
      text: "thread reply",
    }, undefined);
  });

  it("validates exact IDs when validateTarget is true", async () => {
    const raw = createRawMessages();
    raw.messages.sendMessage.mockResolvedValue(messageRefFixture({
      id: MESSAGE_ID,
      channelId: CHANNEL_ID,
    }));
    raw.messages.dmUser.mockResolvedValue(messageRefFixture({
      id: DM_MESSAGE_ID,
      channelId: DM_CHANNEL_ID,
    }));
    raw.messages.sendReply.mockResolvedValue(messageRefFixture({
      id: REPLY_MESSAGE_ID,
      channelId: CHANNEL_ID,
    }));
    const resolveFacadeChannel = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: CHANNEL_ID },
      channel: channelSummary,
    });
    const resolveFacadeUser = vi.fn().mockResolvedValue({
      ok: true,
      summary: "Found user Example User.",
      ids: { userId: USER_ID },
      user: userSummary,
    });
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel,
      resolveFacadeUser,
    });

    await writes.sendFacadeMessage({ channelId: CHANNEL_ID, validateTarget: true, text: "hello" });
    await writes.dmFacadeUser({ userId: USER_ID, validateTarget: true, text: "hello" });
    await writes.replyFacadeThread({
      channelId: CHANNEL_ID,
      validateTarget: true,
      messageId: ROOT_MESSAGE_ID,
      text: "hello",
    });

    expect(resolveFacadeChannel).toHaveBeenCalledWith(CHANNEL_ID);
    expect(resolveFacadeChannel).toHaveBeenCalledTimes(2);
    expect(resolveFacadeUser).toHaveBeenCalledWith(USER_ID);
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
      messageId: ROOT_MESSAGE_ID,
      text: "do not send",
    })).resolves.toBe(channelNotFound);
    expect(raw.messages.sendMessage).not.toHaveBeenCalled();
    expect(raw.messages.sendReply).not.toHaveBeenCalled();
  });

  it("returns facade failure values for missing send and reply channel targets", async () => {
    const raw = createRawMessages();
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.sendFacadeMessage({ text: "missing target" }))
      .resolves.toMatchObject({
        ok: false,
        reason: "invalid_request",
        summary: "messages.send requires channel or channelId.",
        choices: [],
      });

    await expect(writes.replyFacadeThread({ messageId: ROOT_MESSAGE_ID, text: "missing target" }))
      .resolves.toMatchObject({
        ok: false,
        reason: "invalid_request",
        summary: "threads.reply requires channel or channelId.",
        choices: [],
      });

    expect(raw.messages.sendMessage).not.toHaveBeenCalled();
    expect(raw.messages.sendReply).not.toHaveBeenCalled();
  });

  it("returns invalid_request for blank exact IDs", async () => {
    const raw = createRawMessages();
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.sendFacadeMessage({ channelId: " " as ChannelId, text: "missing target" }))
      .resolves.toMatchObject({ ok: false, reason: "invalid_request" });
    await expect(writes.dmFacadeUser({ userId: " " as UserId, text: "missing target" }))
      .resolves.toMatchObject({ ok: false, reason: "invalid_request" });
    await expect(writes.replyFacadeThread({
      channelId: " " as ChannelId,
      messageId: ROOT_MESSAGE_ID,
      text: "missing target",
    })).resolves.toMatchObject({ ok: false, reason: "invalid_request" });

    expect(raw.messages.sendMessage).not.toHaveBeenCalled();
    expect(raw.messages.dmUser).not.toHaveBeenCalled();
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

  it("returns a value failure when generated sendMessage throws", async () => {
    const raw = createRawMessages();
    const error = apiError(403);
    raw.messages.sendMessage.mockRejectedValue(error);
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn().mockResolvedValue({
        ok: true,
        summary: "Found channel #general.",
        ids: { channelId: CHANNEL_ID },
        channel: channelSummary,
      }),
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.sendFacadeMessage({
      channel: "#general",
      text: "hello",
    })).resolves.toMatchObject({
      ok: false,
      reason: "api_error",
      summary: "Pumble API rejected messages.send.",
      choices: [],
      nextActions: ["Inspect the raw error or retry after correcting the request."],
      cause: error,
    });
  });

  it("returns a value failure when generated dmUser throws", async () => {
    const raw = createRawMessages();
    const error = apiError(403);
    raw.messages.dmUser.mockRejectedValue(error);
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser: vi.fn().mockResolvedValue({
        ok: true,
        summary: "Found user Example User.",
        ids: { userId: USER_ID },
        user: userSummary,
      }),
    });

    await expect(writes.dmFacadeUser({
      user: "user@example.invalid",
      text: "hello",
    })).resolves.toMatchObject({
      ok: false,
      reason: "api_error",
      summary: "Pumble API rejected messages.dm.",
      choices: [],
      nextActions: ["Inspect the raw error or retry after correcting the request."],
      cause: error,
    });
  });

  it("returns a value failure when generated sendReply throws", async () => {
    const raw = createRawMessages();
    const error = apiError(403);
    raw.messages.sendReply.mockRejectedValue(error);
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn().mockResolvedValue({
        ok: true,
        summary: "Found channel #general.",
        ids: { channelId: CHANNEL_ID },
        channel: channelSummary,
      }),
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.replyFacadeThread({
      channel: "#general",
      messageId: ROOT_MESSAGE_ID,
      text: "hello",
    })).resolves.toMatchObject({
      ok: false,
      reason: "api_error",
      summary: "Pumble API rejected threads.reply.",
      choices: [],
      nextActions: ["Inspect the raw error or retry after correcting the request."],
      cause: error,
    });
  });

  it("returns a value failure when generated searchMessages throws", async () => {
    const raw = createRawMessages();
    const error = new Error("socket reset");
    raw.messages.searchMessages.mockRejectedValue(error);
    const writes = createFacadeWrites({
      raw,
      resolveFacadeChannel: vi.fn(),
      resolveFacadeUser: vi.fn(),
    });

    await expect(writes.searchRecent({ query: "deploy" })).resolves.toMatchObject({
      ok: false,
      reason: "transport_error",
      summary: "Pumble API rejected search.recent.",
      choices: [],
      nextActions: ["Inspect the raw error or retry after correcting the request."],
      cause: error,
    });
  });

  it("accepts typed fixture summaries without widening generated fixtures", () => {
    expect(channelFixture(channelSummary).id).toBe(CHANNEL_ID);
    expect(userFixture(userSummary).id).toBe(USER_ID);
  });
});
