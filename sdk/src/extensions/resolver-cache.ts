import type { ChannelListEntry } from "../models/channel-list-entry.js";
import type { User } from "../models/user.js";
import type { ResolveChannelClient, ResolveUserClient } from "./resolve.js";

export type ResolverCacheState = "empty" | "loaded";

export interface ResolverCacheInfo {
  channels: ResolverCacheState;
  users: ResolverCacheState;
}

type ResolverSource = ResolveChannelClient & ResolveUserClient;

export function createResolverCache(source: ResolverSource) {
  let channelCache: Promise<ChannelListEntry[]> | undefined;
  let userCache: Promise<User[]> | undefined;

  function loadChannels() {
    const cached = source.channels.listChannels().catch((error: unknown) => {
      if (channelCache === cached) channelCache = undefined;
      throw error;
    });
    channelCache = cached;
    return cached;
  }

  function loadUsers() {
    const cached = source.users.listUsers().catch((error: unknown) => {
      if (userCache === cached) userCache = undefined;
      throw error;
    });
    userCache = cached;
    return cached;
  }

  return {
    client: {
      channels: {
        listChannels() {
          return channelCache ?? loadChannels();
        },
      },
      users: {
        listUsers() {
          return userCache ?? loadUsers();
        },
      },
    },
    clearCache() {
      channelCache = undefined;
      userCache = undefined;
    },
    async refresh() {
      loadChannels();
      loadUsers();
      await Promise.all([channelCache, userCache]);
    },
    cacheInfo(): ResolverCacheInfo {
      return {
        channels: channelCache === undefined ? "empty" : "loaded",
        users: userCache === undefined ? "empty" : "loaded",
      };
    },
  };
}
