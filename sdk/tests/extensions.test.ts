// Mocked unit tests for the hand-written extensions (other than
// searchAllMessages, which has its own test file).

import { describe, expect, it, vi } from "vitest";
import {
  listAllMessages,
  findUserByEmail,
  findChannelByName,
  withRetries,
  asChannelId,
  asMessageId,
  asUserId,
  isPumbleIdLike,
} from "../src/extensions/index.js";

describe("listAllMessages", () => {
  it("walks history until hasMoreBefore is falsy", async () => {
    let call = 0;
    const mock = {
      messages: {
        async listMessages() {
          call++;
          if (call === 1) {
            return {
              result: {
                messages: [
                  { id: "m1", text: "newest" } as any,
                  { id: "m2", text: "next" } as any,
                ],
                hasMoreBefore: true,
                hasMoreAfter: null,
              },
            };
          }
          if (call === 2) {
            return {
              result: {
                messages: [
                  { id: "m3", text: "older" } as any,
                ],
                hasMoreBefore: false,
                hasMoreAfter: null,
              },
            };
          }
          return { result: { messages: [], hasMoreBefore: false, hasMoreAfter: null } };
        },
      },
    };
    const got: string[] = [];
    for await (const m of listAllMessages(mock, { channelId: "c1" })) {
      got.push(m.id);
    }
    expect(got).toEqual(["m1", "m2", "m3"]);
    expect(call).toBe(2);
  });

  it("dedupes across overlapping pages", async () => {
    let call = 0;
    const mock = {
      messages: {
        async listMessages() {
          call++;
          if (call === 1) {
            return {
              result: {
                messages: [{ id: "a" } as any, { id: "b" } as any],
                hasMoreBefore: true,
                hasMoreAfter: null,
              },
            };
          }
          return {
            result: {
              messages: [{ id: "b" } as any, { id: "c" } as any],
              hasMoreBefore: false,
              hasMoreAfter: null,
            },
          };
        },
      },
    };
    const got: string[] = [];
    for await (const m of listAllMessages(mock, { channelId: "c1" })) got.push(m.id);
    expect(got).toEqual(["a", "b", "c"]);
  });

  it("honors maxResults", async () => {
    const mock = {
      messages: {
        async listMessages() {
          return {
            result: {
              messages: [{ id: "x1" } as any, { id: "x2" } as any, { id: "x3" } as any],
              hasMoreBefore: true,
              hasMoreAfter: null,
            },
          };
        },
      },
    };
    const got: string[] = [];
    for await (const m of listAllMessages(mock, { channelId: "c1" }, { maxResults: 2 })) {
      got.push(m.id);
    }
    expect(got).toEqual(["x1", "x2"]);
  });
});

describe("findUserByEmail", () => {
  const mock = {
    users: {
      async listUsers() {
        return [
          { id: "u1", email: "alice@example.com", name: "Alice" },
          { id: "u2", email: "BoB@Example.com", name: "Bob" },
          { id: "u3", email: undefined, name: "ghost" },
        ] as any;
      },
    },
    channels: { async listChannels() { return []; } },
  };

  it("case-insensitive by default", async () => {
    const u = await findUserByEmail(mock, "BOB@example.com");
    expect(u?.id).toBe("u2");
  });

  it("returns undefined when not found", async () => {
    expect(await findUserByEmail(mock, "nope@example.com")).toBeUndefined();
  });

  it("case-sensitive mode respects exact match", async () => {
    const u = await findUserByEmail(mock, "BoB@Example.com", { caseInsensitive: false });
    expect(u?.id).toBe("u2");
    expect(await findUserByEmail(mock, "bob@example.com", { caseInsensitive: false })).toBeUndefined();
  });
});

describe("findChannelByName", () => {
  const mock = {
    users: { async listUsers() { return []; } },
    channels: {
      async listChannels() {
        return [
          { channel: { id: "c1", name: "general" } },
          { channel: { id: "c2", name: "Engineering" } },
        ] as any;
      },
    },
  };

  it("finds with case-insensitive match", async () => {
    const c = await findChannelByName(mock, "engineering");
    expect(c?.id).toBe("c2");
  });
});

describe("withRetries", () => {
  it("retries on default-transient errors then succeeds", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        const e: any = new Error("temporary");
        e.code = "ECONNRESET";
        throw e;
      }
      return "ok";
    });
    const result = await withRetries(fn, { baseMs: 1, maxAttempts: 5 });
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("rethrows permanent error immediately", async () => {
    let attempts = 0;
    await expect(withRetries(async () => {
      attempts++;
      throw new TypeError("bad input");
    }, { baseMs: 1 })).rejects.toThrow("bad input");
    expect(attempts).toBe(1);
  });

  it("respects maxAttempts and bubbles the last error", async () => {
    let attempts = 0;
    await expect(withRetries(async () => {
      attempts++;
      const e: any = new Error("flaky");
      e.code = "ETIMEDOUT";
      throw e;
    }, { baseMs: 1, maxAttempts: 2 })).rejects.toThrow("flaky");
    expect(attempts).toBe(2);
  });

  it("calls onRetry observer before each sleep", async () => {
    const seen: number[] = [];
    let attempts = 0;
    await withRetries(async () => {
      attempts++;
      if (attempts < 3) {
        const e: any = new Error("x");
        e.code = "ECONNRESET";
        throw e;
      }
      return "ok";
    }, { baseMs: 1, maxAttempts: 5, onRetry: ({ attempt }) => seen.push(attempt) });
    expect(seen).toEqual([1, 2]);
  });
});

describe("branded ids", () => {
  it("tags valid 24-hex ids", () => {
    const c = asChannelId("bbbbbbbbbbbbbbbbbbbb0001");
    const m = asMessageId("cccccccccccccccccccc0001");
    const u = asUserId("aaaaaaaaaaaaaaaaaaaa0001");
    expect(typeof c).toBe("string");
    expect(typeof m).toBe("string");
    expect(typeof u).toBe("string");
  });

  it("rejects non-hex inputs", () => {
    expect(() => asChannelId("not-an-id")).toThrow(/expected a 24-character hex string/);
    expect(() => asChannelId("bbbbbbbbbbbbbbbbbbbb000z")).toThrow();
    expect(() => asMessageId("")).toThrow();
  });

  it("isPumbleIdLike: shape check, no throw", () => {
    expect(isPumbleIdLike("bbbbbbbbbbbbbbbbbbbb0001")).toBe(true);
    expect(isPumbleIdLike("xx")).toBe(false);
    expect(isPumbleIdLike(123 as any)).toBe(false);
  });
});
