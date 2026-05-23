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
  assertFacadeOk,
  createPumbleClient,
  isFacadeFailure,
  type FacadeSendReceipt,
} from "../src/extensions/index.js";
import { messageRefFixture, userFixture } from "./helpers/fixtures.js";

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
      ids: { channelId: "c1", messageId: "m1" },
      channel: { id: "c1", name: "general", channelType: "PUBLIC" },
      message: { id: "m1", channelId: "c1" },
    } satisfies Result;
    const narrowed = assertFacadeOk(success);
    expectTypeOf(narrowed).toMatchTypeOf<FacadeSendReceipt>();
    expect(narrowed.ids.messageId).toBe("m1");

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
    const user = userFixture({ id: "u1", email: "me@example.invalid", name: "Me" });
    const myInfo = vi.spyOn(client.raw.users, "myInfo").mockResolvedValue(user);

    await expect(client.identity.me()).resolves.toBe(user);
    expect(myInfo).toHaveBeenCalledOnce();
  });

  it("delegates channels.findByName through findChannelByName", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const channel = { id: "c1", name: "general" };
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
    const user = { id: "u1", email: "u@example.invalid" };
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
    const result = { ok: true, value: { id: "c1", name: "general" } };
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
      value: { id: "c1", name: "general", channelType: "PUBLIC" },
    };
    delegates.resolveChannel.mockResolvedValue(result);

    await expect(client.channels.find("#general")).resolves.toEqual({
      ok: true,
      summary: "Found channel #general.",
      ids: { channelId: "c1" },
      channel: { id: "c1", name: "general", channelType: "PUBLIC" },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(
      client.raw,
      "#general",
      undefined,
    );
  });

  it("delegates users.resolve through resolveUser", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const result = { ok: true, value: { id: "u1", email: "u@example.invalid" } };
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
      value: { id: "u1", email: "u@example.invalid", name: "Ada" },
    };
    delegates.resolveUser.mockResolvedValue(result);

    await expect(client.users.find("u@example.invalid")).resolves.toEqual({
      ok: true,
      summary: "Found user Ada.",
      ids: { userId: "u1" },
      user: { id: "u1", email: "u@example.invalid", name: "Ada" },
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
      value: { id: "c1", name: "general", channelType: "PUBLIC" },
    });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: "m1", channelId: "c1" }));

    await expect(client.messages.send({
      channel: "#general",
      text: "hello from facade",
    })).resolves.toEqual({
      ok: true,
      summary: "Sent message m1 to #general.",
      ids: { channelId: "c1", messageId: "m1" },
      channel: { id: "c1", name: "general", channelType: "PUBLIC" },
      message: { id: "m1", channelId: "c1" },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      channelId: "c1",
      text: "hello from facade",
    }, undefined);
  });

  it("messages.send resolves channel IDs before writing and returns truthful channel metadata", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: "c2", name: "ops-private", channelType: "PRIVATE" },
    });
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage")
      .mockResolvedValue(messageRefFixture({ id: "m2", channelId: "c2" }));

    await expect(client.messages.send({
      channelId: "c2",
      text: "private note",
    })).resolves.toEqual({
      ok: true,
      summary: "Sent message m2 to #ops-private.",
      ids: { channelId: "c2", messageId: "m2" },
      channel: { id: "c2", name: "ops-private", channelType: "PRIVATE" },
      message: { id: "m2", channelId: "c2" },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(client.raw, "c2", undefined);
    expect(sendMessage).toHaveBeenCalledWith({
      channelId: "c2",
      text: "private note",
    }, undefined);
  });

  it("messages.send returns channel choices instead of guessing on ambiguity", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: false,
      reason: "ambiguous",
      candidates: [
        { id: "c1", name: "general", channelType: "PUBLIC" },
        { id: "c2", name: "general-team", channelType: "PRIVATE" },
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
        { id: "c1", name: "general", channelType: "PUBLIC", label: "#general | PUBLIC | c1" },
        {
          id: "c2",
          name: "general-team",
          channelType: "PRIVATE",
          label: "#general-team | PRIVATE | c2",
        },
      ],
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("messages.dm resolves user emails before writing and returns a structured receipt", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveUser.mockResolvedValue({
      ok: true,
      value: { id: "u1", email: "ada@example.invalid", name: "Ada" },
    });
    const dmUser = vi.spyOn(client.raw.messages, "dmUser")
      .mockResolvedValue(messageRefFixture({ id: "m1", channelId: "dm1" }));

    await expect(client.messages.dm({
      user: "ada@example.invalid",
      text: "hello Ada",
    })).resolves.toEqual({
      ok: true,
      summary: "Sent DM m1 to Ada.",
      ids: { userId: "u1", messageId: "m1", channelId: "dm1" },
      user: { id: "u1", email: "ada@example.invalid", name: "Ada" },
      message: { id: "m1", channelId: "dm1" },
    });
    expect(dmUser).toHaveBeenCalledWith({
      userId: "u1",
      text: "hello Ada",
    }, undefined);
  });

  it("threads.reply resolves channel names before writing thread replies", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: "c1", name: "general", channelType: "PUBLIC" },
    });
    const sendReply = vi.spyOn(client.raw.messages, "sendReply")
      .mockResolvedValue(messageRefFixture({ id: "r1", channelId: "c1" }));

    await expect(client.threads.reply({
      channel: "#general",
      messageId: "root1",
      text: "thread reply",
    })).resolves.toEqual({
      ok: true,
      summary: "Replied with r1 in #general.",
      ids: { channelId: "c1", messageId: "r1", rootMessageId: "root1" },
      channel: { id: "c1", name: "general", channelType: "PUBLIC" },
      message: { id: "r1", channelId: "c1" },
    });
    expect(sendReply).toHaveBeenCalledWith({
      channelId: "c1",
      messageId: "root1",
      text: "thread reply",
    }, undefined);
  });

  it("threads.reply resolves channel IDs before writing thread replies", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    delegates.resolveChannel.mockResolvedValue({
      ok: true,
      value: { id: "c2", name: "ops-private", channelType: "PRIVATE" },
    });
    const sendReply = vi.spyOn(client.raw.messages, "sendReply")
      .mockResolvedValue(messageRefFixture({ id: "r2", channelId: "c2" }));

    await expect(client.threads.reply({
      channelId: "c2",
      messageId: "root2",
      text: "private reply",
    })).resolves.toEqual({
      ok: true,
      summary: "Replied with r2 in #ops-private.",
      ids: { channelId: "c2", messageId: "r2", rootMessageId: "root2" },
      channel: { id: "c2", name: "ops-private", channelType: "PRIVATE" },
      message: { id: "r2", channelId: "c2" },
    });
    expect(delegates.resolveChannel).toHaveBeenCalledWith(client.raw, "c2", undefined);
    expect(sendReply).toHaveBeenCalledWith({
      channelId: "c2",
      messageId: "root2",
      text: "private reply",
    }, undefined);
  });
});
