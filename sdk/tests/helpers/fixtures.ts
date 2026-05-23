import type { Channel } from "../../src/models/channel.js";
import type { ChannelListEntry } from "../../src/models/channel-list-entry.js";
import type { MessageRef } from "../../src/models/message-ref.js";
import type { User } from "../../src/models/user.js";

export function channelFixture(overrides: Partial<Channel> = {}): Channel {
  return {
    id: "channel-1",
    name: "general",
    channelType: "PUBLIC",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

export function channelEntryFixture(
  overrides: Partial<ChannelListEntry> & { channel?: Partial<Channel> } = {},
): ChannelListEntry {
  const { channel, ...entryOverrides } = overrides;
  return {
    channel: channelFixture(channel),
    users: [],
    ...entryOverrides,
  };
}

export function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "user@example.invalid",
    name: "Example User",
    role: "MEMBER",
    status: "ACTIVATED",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

export function messageRefFixture(overrides: Partial<MessageRef> = {}): MessageRef {
  return {
    id: "message-1",
    channelId: "channel-1",
    ...overrides,
  };
}
