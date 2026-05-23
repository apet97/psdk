import { describe, expect, it, vi } from "vitest";
import {
  assertFacadeOk,
  createFacadeFailure,
  isFacadeFailure,
} from "../src/extensions/facade-failure.js";
import { createResolverCache } from "../src/extensions/resolver-cache.js";

describe("facade failure internals", () => {
  it("keeps facade failures as typed values with candidate labels", () => {
    const failure = createFacadeFailure("Channel", "gen", {
      ok: false,
      reason: "ambiguous",
      candidates: [
        { id: "c1", name: "general", channelType: "PUBLIC" },
        { id: "c2", name: "general-team", channelType: "PRIVATE" },
      ],
    });

    expect(isFacadeFailure(failure)).toBe(true);
    expect(failure).toEqual({
      ok: false,
      reason: "ambiguous",
      summary: "Channel \"gen\" is ambiguous.",
      choices: [
        { id: "c1", name: "general", channelType: "PUBLIC", label: "#general | PUBLIC | c1" },
        {
          id: "c2",
          name: "general-team",
          channelType: "PRIVATE",
          label: "#general-team | PRIVATE | c2",
        },
      ],
      nextActions: ["Use a more exact Channel value or pass one returned channel id."],
    });
    expect(() => assertFacadeOk(failure)).toThrow(
      "Channel \"gen\" is ambiguous. Next actions: Use a more exact Channel value or pass one returned channel id.",
    );
  });
});

describe("resolver cache internals", () => {
  it("clears failed list promises and reuses successful cached results", async () => {
    const channels = [{ channel: { id: "c1", name: "general", channelType: "PUBLIC" } }];
    const users = [{ id: "u1", email: "ada@example.invalid", name: "Ada" }];
    const listChannels = vi.fn()
      .mockRejectedValueOnce(new Error("temporary channels failure"))
      .mockResolvedValueOnce(channels);
    const listUsers = vi.fn().mockResolvedValue(users);
    const cache = createResolverCache({
      channels: { listChannels },
      users: { listUsers },
    });

    await expect(cache.client.channels.listChannels()).rejects.toThrow("temporary channels failure");
    expect(cache.cacheInfo()).toEqual({ channels: "empty", users: "empty" });
    await expect(cache.client.channels.listChannels()).resolves.toBe(channels);
    await expect(cache.client.channels.listChannels()).resolves.toBe(channels);
    await expect(cache.client.users.listUsers()).resolves.toBe(users);
    await expect(cache.client.users.listUsers()).resolves.toBe(users);

    expect(cache.cacheInfo()).toEqual({ channels: "loaded", users: "loaded" });
    expect(listChannels).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });
});
