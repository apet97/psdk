import { describe, expect, it } from "vitest";
import {
  formatChannelCandidateLabel,
  formatUserCandidateLabel,
  resolveChannel,
  resolveUser,
} from "../src/extensions/index.js";
import { channelEntryFixture, userFixture } from "./helpers/fixtures.js";

const users = [
  userFixture({
    id: "u1",
    email: "alice@example.com",
    name: "Alice Johnson",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
    phone: "+1-555-0101",
  }),
  userFixture({
    id: "u2",
    email: "alex@example.com",
    name: "Alex Stone",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
  }),
  userFixture({
    id: "u3",
    email: "alexis@example.com",
    name: "Alexis Stone",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "w1",
  }),
];

const channels = [
  channelEntryFixture({
    channel: {
      id: "c1",
      name: "general",
      channelType: "PUBLIC",
      workspaceId: "w1",
      description: "Workspace talk",
    },
    users: ["u1"],
  }),
  channelEntryFixture({
    channel: {
      id: "c2",
      name: "engineering",
      channelType: "PRIVATE",
      workspaceId: "w1",
    },
  }),
  channelEntryFixture({
    channel: {
      id: "c3",
      name: "engineering-support",
      channelType: "PUBLIC",
      workspaceId: "w1",
    },
  }),
];

const client = {
  users: {
    async listUsers() {
      return users;
    },
  },
  channels: {
    async listChannels() {
      return channels;
    },
  },
};

describe("resolveUser", () => {
  it("formats user candidate labels from the shared helper", () => {
    expect(formatUserCandidateLabel({
      id: "u1",
      email: "alice@example.com",
      name: "Alice Johnson",
    })).toBe("Alice Johnson alice@example.com | u1");
    expect(formatUserCandidateLabel({
      id: "u2",
      email: "nameless@example.com",
      name: "  ",
    })).toBe("nameless@example.com | u2");
  });

  it("resolves an exact user id before human-name matching", async () => {
    await expect(resolveUser(client, "u2")).resolves.toEqual({
      ok: true,
      value: users[1],
    });
  });

  it("resolves an exact user email", async () => {
    await expect(resolveUser(client, "ALICE@example.com")).resolves.toEqual({
      ok: true,
      value: users[0],
    });
  });

  it("resolves an exact user name before partial matches", async () => {
    await expect(resolveUser(client, "Alex Stone")).resolves.toEqual({
      ok: true,
      value: users[1],
    });
  });

  it("returns not_found without throwing when no user matches", async () => {
    await expect(resolveUser(client, "nobody")).resolves.toEqual({
      ok: false,
      reason: "not_found",
      candidates: [],
    });
  });

  it("returns sanitized candidates when a user name is ambiguous", async () => {
    await expect(resolveUser(client, "alex")).resolves.toEqual({
      ok: false,
      reason: "ambiguous",
      candidates: [
        {
          id: "u2",
          email: "alex@example.com",
          name: "Alex Stone",
          label: "Alex Stone alex@example.com | u2",
        },
        {
          id: "u3",
          email: "alexis@example.com",
          name: "Alexis Stone",
          label: "Alexis Stone alexis@example.com | u3",
        },
      ],
    });
  });
});

describe("resolveChannel", () => {
  it("formats channel candidate labels from the shared helper", () => {
    expect(formatChannelCandidateLabel({
      id: "c1",
      name: "general",
      channelType: "PUBLIC",
    })).toBe("#general | PUBLIC | c1");
  });

  it("resolves an exact channel id before human-name matching", async () => {
    await expect(resolveChannel(client, "c2")).resolves.toEqual({
      ok: true,
      value: channels[1]!.channel,
    });
  });

  it("resolves an exact channel name with a leading #", async () => {
    await expect(resolveChannel(client, " #general ")).resolves.toEqual({
      ok: true,
      value: channels[0]!.channel,
    });
  });

  it("returns not_found without throwing when no channel matches", async () => {
    await expect(resolveChannel(client, "sales")).resolves.toEqual({
      ok: false,
      reason: "not_found",
      candidates: [],
    });
  });

  it("returns sanitized candidates when a channel name is ambiguous", async () => {
    await expect(resolveChannel(client, "engineering")).resolves.toEqual({
      ok: true,
      value: channels[1]!.channel,
    });

    await expect(resolveChannel(client, "engine")).resolves.toEqual({
      ok: false,
      reason: "ambiguous",
      candidates: [
        {
          id: "c2",
          name: "engineering",
          channelType: "PRIVATE",
          label: "#engineering | PRIVATE | c2",
        },
        {
          id: "c3",
          name: "engineering-support",
          channelType: "PUBLIC",
          label: "#engineering-support | PUBLIC | c3",
        },
      ],
    });
  });
});
