import { describe, expect, it, vi } from "vitest";
import { createResolverCache } from "../src/extensions/resolver-cache.js";

function source(channels: () => Promise<unknown>, users: () => Promise<unknown>) {
  return {
    channels: {
      listChannels: channels as () => Promise<never>,
    },
    users: {
      listUsers: users as () => Promise<never>,
    },
  } as unknown as Parameters<typeof createResolverCache>[0];
}

describe("resolver cache metrics", () => {
  it("counts hits and misses on the channel cache", async () => {
    const loader = vi.fn(async () => []);
    const cache = createResolverCache(source(loader, async () => []), { ttlMs: 1000 });
    await cache.client.channels.listChannels();
    await cache.client.channels.listChannels();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.metrics()).toEqual({ hits: 1, misses: 1, evictions: 0 });
  });

  it("counts hits and misses on the user cache", async () => {
    const loader = vi.fn(async () => []);
    const cache = createResolverCache(source(async () => [], loader), { ttlMs: 1000 });
    await cache.client.users.listUsers();
    await cache.client.users.listUsers();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.metrics()).toEqual({ hits: 1, misses: 1, evictions: 0 });
  });

  it("reports evictions when clearCache runs", async () => {
    const cache = createResolverCache(source(async () => [], async () => []), { ttlMs: 1000 });
    await cache.client.channels.listChannels();
    await cache.client.users.listUsers();
    cache.clearCache();
    expect(cache.metrics()).toEqual({ hits: 0, misses: 2, evictions: 2 });
  });

  it("treats failed loads as misses without poisoning the cache", async () => {
    const fail = vi.fn(async () => {
      throw new Error("nope");
    });
    const cache = createResolverCache(source(fail, async () => []), { ttlMs: 1000 });
    await expect(cache.client.channels.listChannels()).rejects.toThrow("nope");
    const ok = vi.fn(async () => []);
    const cache2 = createResolverCache(source(ok, async () => []), { ttlMs: 1000 });
    await cache2.client.channels.listChannels();
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
