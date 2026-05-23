import type { ChannelListEntry } from "../models/channel-list-entry.js";
import type { User } from "../models/user.js";
import type { ResolveChannelClient, ResolveUserClient } from "./resolve.js";

export type ResolverCacheState = "empty" | "loaded";

export interface ResolverCacheInfo {
  channels: ResolverCacheState;
  users: ResolverCacheState;
}

type ResolverSource = ResolveChannelClient & ResolveUserClient;

export interface ResolverCacheConfig {
  ttlMs?: number | undefined;
  refreshOnMiss?: boolean | undefined;
}

type CacheEntry<T> = {
  promise: Promise<T>;
  loadedAt: number;
};

function isFresh<T>(entry: CacheEntry<T>, ttlMs: number | undefined): boolean {
  return ttlMs === undefined || Date.now() - entry.loadedAt <= ttlMs;
}

export function createResolverCache(
  source: ResolverSource,
  config: ResolverCacheConfig = {},
) {
  let channelCache: CacheEntry<ChannelListEntry[]> | undefined;
  let userCache: CacheEntry<User[]> | undefined;

  function loadChannels() {
    const entry: CacheEntry<ChannelListEntry[]> = {
      loadedAt: Date.now(),
      promise: source.channels.listChannels().catch((error: unknown) => {
        if (channelCache === entry) channelCache = undefined;
        throw error;
      }),
    };
    channelCache = entry;
    return entry.promise;
  }

  function loadUsers() {
    const entry: CacheEntry<User[]> = {
      loadedAt: Date.now(),
      promise: source.users.listUsers().catch((error: unknown) => {
        if (userCache === entry) userCache = undefined;
        throw error;
      }),
    };
    userCache = entry;
    return entry.promise;
  }

  function cachedChannels() {
    const cached = channelCache;
    if (cached !== undefined) {
      if (isFresh(cached, config.ttlMs)) return cached.promise;
      if (config.refreshOnMiss === false) return cached.promise;
    }
    return loadChannels();
  }

  function cachedUsers() {
    const cached = userCache;
    if (cached !== undefined) {
      if (isFresh(cached, config.ttlMs)) return cached.promise;
      if (config.refreshOnMiss === false) return cached.promise;
    }
    return loadUsers();
  }

  return {
    client: {
      channels: {
        listChannels() {
          return cachedChannels();
        },
      },
      users: {
        listUsers() {
          return cachedUsers();
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
      await Promise.all([channelCache?.promise, userCache?.promise]);
    },
    cacheInfo(): ResolverCacheInfo {
      return {
        channels: channelCache === undefined ? "empty" : "loaded",
        users: userCache === undefined ? "empty" : "loaded",
      };
    },
  };
}
