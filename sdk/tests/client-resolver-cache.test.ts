import { describe, expect, it, vi } from "vitest";
import { createPumbleClient } from "../src/extensions/index.js";

const channelEntries = [
  {
    channel: {
      id: "c1",
      name: "general",
      channelType: "PUBLIC",
      workspaceId: "w1",
    },
    users: [],
  },
  {
    channel: {
      id: "c2",
      name: "ops",
      channelType: "PRIVATE",
      workspaceId: "w1",
    },
    users: [],
  },
] as any;

const users = [
  {
    id: "u1",
    email: "ada@example.invalid",
    name: "Ada Lovelace",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
  },
  {
    id: "u2",
    email: "grace@example.invalid",
    name: "Grace Hopper",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
  },
] as any;

function cachedClient() {
  const client = createPumbleClient({ apiKeyAuth: "x", resolverCache: true });
  const listChannels = vi.spyOn(client.raw.channels, "listChannels")
    .mockResolvedValue(channelEntries);
  const listUsers = vi.spyOn(client.raw.users, "listUsers")
    .mockResolvedValue(users);
  vi.spyOn(client.raw.messages, "sendMessage")
    .mockResolvedValue({ id: "m1", channelId: "c1" } as any);
  vi.spyOn(client.raw.messages, "sendReply")
    .mockResolvedValue({ id: "r1", channelId: "c1" } as any);
  vi.spyOn(client.raw.messages, "dmUser")
    .mockResolvedValue({ id: "d1", channelId: "dm1" } as any);
  return { client, listChannels, listUsers };
}

describe("createPumbleClient resolverCache", () => {
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
    await client.threads.reply({ channel: "general", messageId: "root1", text: "reply" });
    await client.users.find("ada@example.invalid");
    await client.messages.dm({ user: "ada@example.invalid", text: "dm" });

    expect(listChannels).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
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
