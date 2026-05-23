import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

const delegates = vi.hoisted(() => ({
  findChannelByName: vi.fn(),
  findUserByEmail: vi.fn(),
  resolveChannel: vi.fn(),
  resolveUser: vi.fn(),
}));

vi.mock("../src/extensions/find.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/extensions/find.js")>();
  return {
    ...actual,
    findChannelByName: delegates.findChannelByName,
    findUserByEmail: delegates.findUserByEmail,
  };
});

vi.mock("../src/extensions/resolve.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/extensions/resolve.js")>();
  return {
    ...actual,
    resolveChannel: delegates.resolveChannel,
    resolveUser: delegates.resolveUser,
  };
});

import {
  asChannelId,
  asMessageId,
  asUserId,
  assertFacadeOk,
  createPumbleClient,
  isFacadeFailure,
  type ChannelId,
  type FacadeSendReceipt,
  type MessageId,
  type UserId,
} from "../src/extensions/index.js";
import { messageRefFixture, userFixture } from "./helpers/fixtures.js";

const CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0001");
const CHANNEL_ID_2 = asChannelId("bbbbbbbbbbbbbbbbbbbb0002");
const FAST_CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0003");
const DM_CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0004");
const USER_ID = asUserId("aaaaaaaaaaaaaaaaaaaa0001");
const FAST_USER_ID = asUserId("aaaaaaaaaaaaaaaaaaaa0002");
const MESSAGE_ID = asMessageId("cccccccccccccccccccc0001");
const MESSAGE_ID_2 = asMessageId("cccccccccccccccccccc0002");
const FAST_MESSAGE_ID = asMessageId("cccccccccccccccccccc0003");
const DM_MESSAGE_ID = asMessageId("cccccccccccccccccccc0004");
const ROOT_MESSAGE_ID = asMessageId("cccccccccccccccccccc0005");
const REPLY_MESSAGE_ID = asMessageId("cccccccccccccccccccc0006");
const REPLY_MESSAGE_ID_2 = asMessageId("cccccccccccccccccccc0007");
const FAST_REPLY_MESSAGE_ID = asMessageId("cccccccccccccccccccc0008");
const FAST_ROOT_MESSAGE_ID = asMessageId("cccccccccccccccccccc0009");

describe("createPumbleClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the generated client as raw", () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });

    expect(client.raw).toBeDefined();
    expect(client.raw.users).toBeDefined();
  });

  it("detects facade failures at runtime", () => {
    const failure = {
      ok: false,
      reason: "not_found",
      summary: "Channel not found.",
      choices: [],
      nextActions: ["Check the channel name."],
    };

    expect(isFacadeFailure(failure)).toBe(true);
    expect(isFacadeFailure({
      ok: false,
      reason: "api_error",
      summary: "Pumble API rejected messages.send.",
      choices: [],
      nextActions: ["Inspect the raw error or retry after correcting the request."],
      cause: new Error("HTTP 403"),
    })).toBe(true);
    expect(isFacadeFailure({
      ok: false,
      reason: "transport_error",
      summary: "Pumble API rejected search.recent.",
      choices: [],
      nextActions: ["Inspect the raw error or retry after correcting the request."],
      cause: new Error("socket reset"),
    })).toBe(true);
    expect(isFacadeFailure({ ok: true, summary: "Sent." })).toBe(false);
    expect(isFacadeFailure(null)).toBe(false);
  });

  it("assertFacadeOk throws actionable failure details and narrows success values", () => {
    type Result = FacadeSendReceipt | {
      ok: false;
      reason: "not_found";
      summary: string;
      choices: [];
      nextActions: string[];
    };

    const success = {
      ok: true,
      summary: "Sent.",
      ids: { channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      channel: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
      message: { id: MESSAGE_ID, channelId: CHANNEL_ID },
    } satisfies Result;
    const narrowed = assertFacadeOk(success);
    expectTypeOf(narrowed).toMatchTypeOf<FacadeSendReceipt>();
    expectTypeOf(narrowed.ids.channelId).toMatchTypeOf<ChannelId>();
    expectTypeOf(narrowed.ids.messageId).toMatchTypeOf<MessageId>();
    expect(narrowed.ids.messageId).toBe(MESSAGE_ID);

    expect(() =>
      assertFacadeOk({
        ok: false,
        reason: "not_found",
        summary: "Channel not found.",
        choices: [],
        nextActions: ["Check the channel name."],
      } satisfies Result)
    ).toThrow("Channel not found. Next actions: Check the channel name.");
  });

  it("delegates identity.me to generated users.myInfo", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const user = userFixture({ id: USER_ID, email: "me@example.invalid", name: "Me" });
    const myInfo = vi.spyOn(client.raw.users, "myInfo").mockResolvedValue(user);

    await expect(client.identity.me()).resolves.toBe(user);
    expect(myInfo).toHaveBeenCalledOnce();
  });

  it("delegates channels.findByName through findChannelByName", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const channel = { id: CHANNEL_ID, name: "general" };
    delegates.findChannelByName.mockResolvedValue(channel);

    await expect(client.channels.findByName("general")).resolves.toBe(channel);
    expect(delegates.findChannelByName).toHaveBeenCalledWith(
      client.raw,
      "general",
      undefined,
    );
  });

  it("delegates users.findByEmail through findUserByEmail", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const user = { id: USER_ID, email: "u@example.invalid" };
    delegates.findUserByEmail.mockResolvedValue(user);

    await expect(client.users.findByEmail("u@example.invalid")).resolves.toBe(user);
    expect(delegates.findUserByEmail).toHaveBeenCalledWith(
      client.raw,
      "u@example.invalid",
      undefined,
    );
  });

  it("delegates channels.resolve through resolveChannel", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const result = { ok: true, value: { id: CHANNEL_ID, name: "general" } };
    delegates.resolveChannel.mockResolvedValue(result);

    await expect(client.channels.resolve("#general")).resolves.toBe(result);
    expect(delegates.resolveChannel).toHaveBeenCalledWith(
      client.raw,
      "#general",
      undefined,
    );
  });

  it("exposes channels.find as the human-friendly channel resolver", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const result = {
      ok: true,
      value: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
    };
    delegates.resolveChannel.mockResolvedValue(result);

    await expect(client.channels.find("#general")).resolves.toEqual({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: CHANNEL_ID },
      channel: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(
      client.raw,
      "#general",
      undefined,
    );
  });

  it("delegates users.resolve through resolveUser", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const result = { ok: true, value: { id: USER_ID, email: "u@example.invalid" } };
    delegates.resolveUser.mockResolvedValue(result);

    await expect(client.users.resolve("u@example.invalid")).resolves.toBe(result);
    expect(delegates.resolveUser).toHaveBeenCalledWith(
      client.raw,
      "u@example.invalid",
      undefined,
    );
  });

  it("exposes users.find as the human-friendly user resolver", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const result = {
      ok: true,
      value: { id: USER_ID, email: "u@example.invalid", name: "Ada" },
    };
    delegates.resolveUser.mockResolvedValue(result);

    await expect(client.users.find("u@example.invalid")).resolves.toEqual({
      ok: true,
      summary: "Found user Ada.",
      ids: { userId: USER_ID },
      user: { id: USER_ID, email: "u@example.invalid", name: "Ada" },
    });
    expect(delegates.resolveUser).toHaveBeenCalledWith(
      client.raw,
      "u@example.invalid",
      undefined,
    );
  });

  it("messages.send resolves channel names before writing and returns a structured receipt", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
    });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: MESSAGE_ID, channelId: CHANNEL_ID }));

    await expect(client.messages.send({
      channel: "#general",
      text: "hello from facade",
    })).resolves.toEqual({
      ok: true,
      summary: `Sent message ${MESSAGE_ID} to #general.`,
      ids: { channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      channel: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
      message: { id: MESSAGE_ID, channelId: CHANNEL_ID },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      channelId: CHANNEL_ID,
      text: "hello from facade",
    }, undefined);
  });

  it("messages.send validates channel IDs when requested and returns truthful channel metadata", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: CHANNEL_ID_2, name: "ops-private", channelType: "PRIVATE" },
    });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: MESSAGE_ID_2, channelId: CHANNEL_ID_2 }));

    await expect(client.messages.send({
      channelId: CHANNEL_ID_2,
      validateTarget: true,
      text: "private note",
    })).resolves.toEqual({
      ok: true,
      summary: `Sent message ${MESSAGE_ID_2} to #ops-private.`,
      ids: { channelId: CHANNEL_ID_2, messageId: MESSAGE_ID_2 },
      channel: { id: CHANNEL_ID_2, name: "ops-private", channelType: "PRIVATE" },
      message: { id: MESSAGE_ID_2, channelId: CHANNEL_ID_2 },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(client.raw, CHANNEL_ID_2, undefined);
    expect(sendMessage).toHaveBeenCalledWith({
      channelId: CHANNEL_ID_2,
      text: "private note",
    }, undefined);
  });

  it("messages.send exact channel IDs bypass resolver by default", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: FAST_MESSAGE_ID, channelId: FAST_CHANNEL_ID }));

    await expect(client.messages.send({
      channelId: FAST_CHANNEL_ID,
      text: "fast path",
    })).resolves.toMatchObject({
      ok: true,
      summary: `Sent message ${FAST_MESSAGE_ID} to channel ${FAST_CHANNEL_ID}.`,
      ids: { channelId: FAST_CHANNEL_ID, messageId: FAST_MESSAGE_ID },
      message: { id: FAST_MESSAGE_ID, channelId: FAST_CHANNEL_ID },
    });
    expect(delegates.resolveChannel).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      channelId: FAST_CHANNEL_ID,
      text: "fast path",
    }, undefined);
  });

  it("messages.send exact channel IDs validate when requested", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: FAST_CHANNEL_ID, name: "fast", channelType: "PUBLIC" },
    });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: FAST_MESSAGE_ID, channelId: FAST_CHANNEL_ID }));

    await expect(client.messages.send({
      channelId: FAST_CHANNEL_ID,
      validateTarget: true,
      text: "fast path",
    })).resolves.toMatchObject({
      ok: true,
      summary: `Sent message ${FAST_MESSAGE_ID} to #fast.`,
      channel: { id: FAST_CHANNEL_ID, name: "fast", channelType: "PUBLIC" },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(client.raw, FAST_CHANNEL_ID, undefined);
    expect(sendMessage).toHaveBeenCalledWith({
      channelId: FAST_CHANNEL_ID,
      text: "fast path",
    }, undefined);
  });

  it("validates raw receipt IDs at the facade boundary", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: "not-a-message-id", channelId: FAST_CHANNEL_ID }));

    await expect(client.messages.send({
      channelId: FAST_CHANNEL_ID,
      text: "invalid raw id",
    })).rejects.toThrow(/asMessageId/);
    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it("messages.send returns channel choices instead of guessing on ambiguity", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: false,
      reason: "ambiguous",
      candidates: [
        { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
        { id: CHANNEL_ID_2, name: "general-team", channelType: "PRIVATE" },
      ],
    });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage");

    await expect(client.messages.send({
      channel: "gen",
      text: "hello from facade",
    })).resolves.toEqual({
      ok: false,
      reason: "ambiguous",
      summary: "Channel \"gen\" is ambiguous.",
      nextActions: ["Use a more exact Channel value or pass one returned channel id."],
      choices: [
        {
          id: CHANNEL_ID,
          name: "general",
          channelType: "PUBLIC",
          label: `#general | PUBLIC | ${CHANNEL_ID}`,
        },
        {
          id: CHANNEL_ID_2,
          name: "general-team",
          channelType: "PRIVATE",
          label: `#general-team | PRIVATE | ${CHANNEL_ID_2}`,
        },
      ],
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("messages.dm resolves user emails before writing and returns a structured receipt", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveUser.mockResolvedValue({
      ok: true,
      value: { id: USER_ID, email: "ada@example.invalid", name: "Ada" },
    });
    const dmUser = vi.spyOn(client.raw.messages, "dmUser")
      .mockResolvedValue(messageRefFixture({ id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID }));

    await expect(client.messages.dm({
      user: "ada@example.invalid",
      text: "hello Ada",
    })).resolves.toEqual({
      ok: true,
      summary: `Sent DM ${DM_MESSAGE_ID} to Ada.`,
      ids: { userId: USER_ID, messageId: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID },
      user: { id: USER_ID, email: "ada@example.invalid", name: "Ada" },
      message: { id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID },
    });
    expect(dmUser).toHaveBeenCalledWith({
      userId: USER_ID,
      text: "hello Ada",
    }, undefined);
  });

  it("messages.dm exact user IDs bypass resolver by default", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const dmUser = vi.spyOn(client.raw.messages, "dmUser")
      .mockResolvedValue(messageRefFixture({ id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID }));

    const result = await client.messages.dm({
      userId: FAST_USER_ID,
      text: "fast dm",
    });
    expect(result).toMatchObject({
      ok: true,
      summary: `Sent DM ${DM_MESSAGE_ID} to user ${FAST_USER_ID}.`,
      ids: { userId: FAST_USER_ID, messageId: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID },
      message: { id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID },
    });
    if (result.ok) {
      expectTypeOf(result.ids.userId).toMatchTypeOf<UserId>();
      expectTypeOf(result.ids.messageId).toMatchTypeOf<MessageId>();
      expectTypeOf(result.ids.channelId).toMatchTypeOf<ChannelId>();
    }
    expect(delegates.resolveUser).not.toHaveBeenCalled();
    expect(dmUser).toHaveBeenCalledWith({
      userId: FAST_USER_ID,
      text: "fast dm",
    }, undefined);
  });

  it("threads.reply resolves channel names before writing thread replies", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
    });
    const sendReply = vi.spyOn(client.raw.messages, "sendReply")
      .mockResolvedValue(messageRefFixture({ id: REPLY_MESSAGE_ID, channelId: CHANNEL_ID }));

    await expect(client.threads.reply({
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
      channel: { id: CHANNEL_ID, name: "general", channelType: "PUBLIC" },
      message: { id: REPLY_MESSAGE_ID, channelId: CHANNEL_ID },
    });
    expect(sendReply).toHaveBeenCalledWith({
      channelId: CHANNEL_ID,
      messageId: ROOT_MESSAGE_ID,
      text: "thread reply",
    }, undefined);
  });

  it("threads.reply validates channel IDs when requested", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: CHANNEL_ID_2, name: "ops-private", channelType: "PRIVATE" },
    });
    const sendReply = vi.spyOn(client.raw.messages, "sendReply")
      .mockResolvedValue(messageRefFixture({ id: REPLY_MESSAGE_ID_2, channelId: CHANNEL_ID_2 }));

    await expect(client.threads.reply({
      channelId: CHANNEL_ID_2,
      validateTarget: true,
      messageId: ROOT_MESSAGE_ID,
      text: "private reply",
    })).resolves.toEqual({
      ok: true,
      summary: `Replied with ${REPLY_MESSAGE_ID_2} in #ops-private.`,
      ids: {
        channelId: CHANNEL_ID_2,
        messageId: REPLY_MESSAGE_ID_2,
        rootMessageId: ROOT_MESSAGE_ID,
      },
      channel: { id: CHANNEL_ID_2, name: "ops-private", channelType: "PRIVATE" },
      message: { id: REPLY_MESSAGE_ID_2, channelId: CHANNEL_ID_2 },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(client.raw, CHANNEL_ID_2, undefined);
    expect(sendReply).toHaveBeenCalledWith({
      channelId: CHANNEL_ID_2,
      messageId: ROOT_MESSAGE_ID,
      text: "private reply",
    }, undefined);
  });

  it("threads.reply exact channel IDs bypass resolver by default", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const sendReply = vi.spyOn(client.raw.messages, "sendReply")
      .mockResolvedValue(messageRefFixture({ id: FAST_REPLY_MESSAGE_ID, channelId: FAST_CHANNEL_ID }));

    await expect(client.threads.reply({
      channelId: FAST_CHANNEL_ID,
      messageId: FAST_ROOT_MESSAGE_ID,
      text: "fast reply",
    })).resolves.toMatchObject({
      ok: true,
      summary: `Replied with ${FAST_REPLY_MESSAGE_ID} in channel ${FAST_CHANNEL_ID}.`,
      ids: {
        channelId: FAST_CHANNEL_ID,
        messageId: FAST_REPLY_MESSAGE_ID,
        rootMessageId: FAST_ROOT_MESSAGE_ID,
      },
      message: { id: FAST_REPLY_MESSAGE_ID, channelId: FAST_CHANNEL_ID },
    });
    expect(delegates.resolveChannel).not.toHaveBeenCalled();
    expect(sendReply).toHaveBeenCalledWith({
      channelId: FAST_CHANNEL_ID,
      messageId: FAST_ROOT_MESSAGE_ID,
      text: "fast reply",
    }, undefined);
  });
});
