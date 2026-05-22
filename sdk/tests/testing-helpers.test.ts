import { describe, expect, it } from "vitest";
import {
  createFixtureBodyHash,
  createMockPumbleFetch,
  sanitizePumbleFixtureValue,
} from "../src/extensions/index.js";
import {
  bodyHash as internalBodyHash,
  sanitizeFixtureValue as internalSanitizeFixtureValue,
} from "../scripts/record-replay-common.mjs";

function liveLikeId(suffix: string): string {
  return `1234567890abcdef1234567${suffix}`;
}

describe("public testing helpers", () => {
  it("sanitizes fixture values with the checked-in replay redaction contract", () => {
    const sanitized = sanitizePumbleFixtureValue({
      body: JSON.stringify({
        id: liveLikeId("1"),
        workspaceId: liveLikeId("2"),
        email: "real.user@customer.invalid",
        name: "Real User",
        text: "private message body",
        references: [
          liveLikeId("1"),
          "contact real.user@customer.invalid",
        ],
      }),
      channel: {
        id: "000000000000000000000003",
        name: "example-name-49b0b15e",
      },
    });

    expect(sanitized).toEqual({
      body: JSON.stringify({
        id: "000000000000000000000001",
        workspaceId: "000000000000000000000002",
        email: "user-1@example.invalid",
        name: "User 1",
        text: "[redacted]",
        references: [
          "000000000000000000000001",
          "contact user-1@example.invalid",
        ],
      }),
      channel: {
        id: "000000000000000000000003",
        name: "example-name-49b0b15e",
      },
    });
  });

  it("hashes fixture bodies structurally like replay fixtures", () => {
    expect(createFixtureBodyHash(undefined)).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(createFixtureBodyHash({ z: 1, a: { b: 2, a: 1 } })).toBe(
      createFixtureBodyHash({ a: { a: 1, b: 2 }, z: 1 }),
    );
    expect(createFixtureBodyHash({ text: "[redacted]", limit: 5 })).toBe(
      "da7729ea0935f2ff89f1180ba7578a5fb5e06b6f2f4f5abab25d80f14837d9c1",
    );
  });

  it("stays in parity with record/replay internals for stable fixture inputs", () => {
    const stableFixtureInput = {
      body: JSON.stringify({
        id: "000000000000000000000003",
        email: "user-7@example.invalid",
        name: "example-name-49b0b15e",
        text: "private message body",
      }),
    };
    const stableBody = { b: 2, a: { d: 4, c: 3 } };

    expect(sanitizePumbleFixtureValue(stableFixtureInput)).toEqual(
      internalSanitizeFixtureValue(stableFixtureInput),
    );
    expect(createFixtureBodyHash(stableBody)).toBe(internalBodyHash(stableBody));
  });

  it("mocks Pumble fetch by method, sorted path, and sanitized structural body hash", async () => {
    const fetch = createMockPumbleFetch([
      {
        request: {
          method: "POST",
          path: "/searchMessages?a=1&b=2",
          body: { text: "fixture text", limit: 5 },
        },
        response: {
          status: 200,
          headers: { "content-type": "application/json" },
          body: { ok: true },
        },
      },
    ]);

    const res = await fetch("https://pumble.example.test/searchMessages?b=2&a=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 5, text: "request text" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns configured Response objects without live credentials", async () => {
    const fetch = createMockPumbleFetch([
      {
        request: { method: "GET", path: "/myInfo" },
        response: new Response("created", {
          status: 201,
          headers: { "x-test": "kept" },
        }),
      },
    ]);

    const res = await fetch("https://pumble.example.test/myInfo");

    expect(res.status).toBe(201);
    expect(res.headers.get("x-test")).toBe("kept");
    expect(await res.text()).toBe("created");
  });

  it("throws loudly on mock misses instead of falling through to live fetch", async () => {
    const fetch = createMockPumbleFetch([]);

    await expect(fetch("https://pumble.example.test/listChannels")).rejects.toThrow(
      /Mock Pumble fetch miss for GET \/listChannels bodyHash=/,
    );
  });
});
