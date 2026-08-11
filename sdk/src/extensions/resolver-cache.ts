import type { ChannelListEntry } from "../models/channel-list-entry.js";
import type { User } from "../models/user.js";
import type { ResolveChannelClient, ResolveUserClient } from "./resolve.js";

export type ResolverCacheState = "empty" | "loaded";

export interface ResolverCacheInfo {
  channels: ResolverCacheState;
  users: ResolverCacheState;
}

interface ResolverCacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
}

type ResolverSource = ResolveChannelClient & ResolveUserClient;

interface ResolverCacheConfig {
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
  let hits = 0;
  let misses = 0;
  let evictions = 0;

  function loadChannels() {
    misses++;
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
    misses++;
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
      if (isFresh(cached, config.ttlMs)) {
        hits++;
        return cached.promise;
      }
      if (config.refreshOnMiss === false) {
        hits++;
        return cached.promise;
      }
    }
    return loadChannels();
  }

  function cachedUsers() {
    const cached = userCache;
    if (cached !== undefined) {
      if (isFresh(cached, config.ttlMs)) {
        hits++;
        return cached.promise;
      }
      if (config.refreshOnMiss === false) {
        hits++;
        return cached.promise;
      }
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
      if (channelCache !== undefined) evictions++;
      if (userCache !== undefined) evictions++;
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
    metrics(): ResolverCacheMetrics {
      return { hits, misses, evictions };
    },
  };
}
