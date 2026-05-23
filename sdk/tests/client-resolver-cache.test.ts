import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  asChannelId,
  asMessageId,
  asUserId,
  createPumbleClient,
} from "../src/extensions/index.js";
import {
  channelEntryFixture,
  messageRefFixture,
  userFixture,
} from "./helpers/fixtures.js";

const CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0201");
const OPS_CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0202");
const DM_CHANNEL_ID = asChannelId("bbbbbbbbbbbbbbbbbbbb0203");
const USER_ID = asUserId("aaaaaaaaaaaaaaaaaaaa0201");
const USER_ID_2 = asUserId("aaaaaaaaaaaaaaaaaaaa0202");
const MESSAGE_ID = asMessageId("cccccccccccccccccccc0201");
const REPLY_MESSAGE_ID = asMessageId("cccccccccccccccccccc0202");
const DM_MESSAGE_ID = asMessageId("cccccccccccccccccccc0203");
const ROOT_MESSAGE_ID = asMessageId("cccccccccccccccccccc0204");

const channelEntries = [
  channelEntryFixture({
    channel: {
      id: CHANNEL_ID,
      name: "general",
      channelType: "PUBLIC",
      workspaceId: "w1",
    },
  }),
  channelEntryFixture({
    channel: {
      id: OPS_CHANNEL_ID,
      name: "ops",
      channelType: "PRIVATE",
      workspaceId: "w1",
    },
  }),
];

const users = [
  userFixture({
    id: USER_ID,
    email: "ada@example.invalid",
    name: "Ada Lovelace",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
  }),
  userFixture({
    id: USER_ID_2,
    email: "grace@example.invalid",
    name: "Grace Hopper",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
  }),
];

function cachedClient() {
  const client = createPumbleClient({ apiKeyAuth: "x", resolverCache: true });
  const listChannels = vi.spyOn(client.raw.channels, "listChannels")
    .mockResolvedValue(channelEntries);
  const listUsers = vi.spyOn(client.raw.users, "listUsers")
    .mockResolvedValue(users);
  vi.spyOn(client.raw.messages, "sendMessage")
    .mockResolvedValue(messageRefFixture({ id: MESSAGE_ID, channelId: CHANNEL_ID }));
  vi.spyOn(client.raw.messages, "sendReply")
    .mockResolvedValue(messageRefFixture({ id: REPLY_MESSAGE_ID, channelId: CHANNEL_ID }));
  vi.spyOn(client.raw.messages, "dmUser")
    .mockResolvedValue(messageRefFixture({ id: DM_MESSAGE_ID, channelId: DM_CHANNEL_ID }));
  return { client, listChannels, listUsers };
}

describe("createPumbleClient resolverCache", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("does not cache resolver lists by default", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const listChannels = vi.spyOn(client.raw.channels, "listChannels")
      .mockResolvedValue(channelEntries);
    const listUsers = vi.spyOn(client.raw.users, "listUsers")
      .mockResolvedValue(users);

    await client.channels.find("general");
    await client.channels.find("ops");
    await client.users.find("ada@example.invalid");
    await client.users.find("grace@example.invalid");

    expect(listChannels).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("reuses listChannels and listUsers across repeated facade calls when enabled", async () => {
    const { client, listChannels, listUsers } = cachedClient();

    await client.channels.find("general");
    await client.messages.send({ channel: "#general", text: "hello" });
    await client.threads.reply({ channel: "general", messageId: ROOT_MESSAGE_ID, text: "reply" });
    await client.users.find("ada@example.invalid");
    await client.messages.dm({ user: "ada@example.invalid", text: "dm" });

    expect(listChannels).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("reuses cached resolver lists before ttl expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const client = createPumbleClient({
      apiKeyAuth: "x",
      resolverCache: { enabled: true, ttlMs: 1_000 },
    });
    const listChannels = vi.spyOn(client.raw.channels, "listChannels")
      .mockResolvedValue(channelEntries);
    const listUsers = vi.spyOn(client.raw.users, "listUsers")
      .mockResolvedValue(users);

    await client.channels.find("general");
    await client.users.find("ada@example.invalid");
    vi.setSystemTime(new Date("2026-01-01T00:00:00.900Z"));
    await client.channels.find("ops");
    await client.users.find("grace@example.invalid");

    expect(listChannels).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("reloads resolver lists after ttl expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const client = createPumbleClient({
      apiKeyAuth: "x",
      resolverCache: { enabled: true, ttlMs: 1_000 },
    });
    const listChannels = vi.spyOn(client.raw.channels, "listChannels")
      .mockResolvedValue(channelEntries);
    const listUsers = vi.spyOn(client.raw.users, "listUsers")
      .mockResolvedValue(users);

    await client.channels.find("general");
    await client.users.find("ada@example.invalid");
    vi.setSystemTime(new Date("2026-01-01T00:00:01.001Z"));
    await client.channels.find("ops");
    await client.users.find("grace@example.invalid");

    expect(listChannels).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("clears a rejected cached channel list so the next facade resolution retries", async () => {
    const { client, listChannels } = cachedClient();
    listChannels
      .mockRejectedValueOnce(new Error("temporary channels failure"))
      .mockResolvedValueOnce(channelEntries);

    await expect(client.channels.find("general")).rejects.toThrow("temporary channels failure");
    await expect(client.channels.find("general")).resolves.toMatchObject({
      ok: true,
      ids: { channelId: CHANNEL_ID },
    });

    expect(listChannels).toHaveBeenCalledTimes(2);
  });

  it("clears a rejected cached user list so the next facade resolution retries", async () => {
    const { client, listUsers } = cachedClient();
    listUsers
      .mockRejectedValueOnce(new Error("temporary users failure"))
      .mockResolvedValueOnce(users);

    await expect(client.users.find("ada@example.invalid")).rejects.toThrow("temporary users failure");
    await expect(client.users.find("ada@example.invalid")).resolves.toMatchObject({
      ok: true,
      ids: { userId: USER_ID },
    });

    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("reports resolver cache state without forcing loads", async () => {
    const { client, listChannels, listUsers } = cachedClient();

    expect(client.resolvers.cacheInfo()).toEqual({ channels: "empty", users: "empty" });
    await client.channels.find("general");
    expect(client.resolvers.cacheInfo()).toEqual({ channels: "loaded", users: "empty" });
    await client.users.find("ada@example.invalid");
    expect(client.resolvers.cacheInfo()).toEqual({ channels: "loaded", users: "loaded" });

    expect(listChannels).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("preflights channel and user targets without writing", async () => {
    const { client } = cachedClient();
    const sendMessage = vi.spyOn(client.raw.messages, "sendMessage");
    const dmUser = vi.spyOn(client.raw.messages, "dmUser");

    await expect(client.resolvers.preflight({
      channel: "general",
      user: "ada@example.invalid",
    })).resolves.toMatchObject({
      ok: true,
      channel: { ok: true, ids: { channelId: CHANNEL_ID } },
      user: { ok: true, ids: { userId: USER_ID } },
    });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(dmUser).not.toHaveBeenCalled();
  });

  it("preflight reports failed target resolutions together", async () => {
    const { client } = cachedClient();

    await expect(client.resolvers.preflight({
      channel: "missing-channel",
      user: "missing-user@example.invalid",
    })).resolves.toMatchObject({
      ok: false,
      channel: { ok: false, reason: "not_found" },
      user: { ok: false, reason: "not_found" },
    });
  });

  it("clearCache forces new list calls", async () => {
    const { client, listChannels, listUsers } = cachedClient();

    await client.channels.find("general");
    await client.users.find("ada@example.invalid");
    client.resolvers.clearCache();
    await client.channels.find("general");
    await client.users.find("ada@example.invalid");

    expect(listChannels).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("refresh preloads both lists and facade calls use the refreshed data", async () => {
    const { client, listChannels, listUsers } = cachedClient();

    await client.resolvers.refresh();
    await client.messages.send({ channel: "general", text: "hello" });
    await client.messages.dm({ user: "ada@example.invalid", text: "dm" });

    expect(listChannels).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });
});
