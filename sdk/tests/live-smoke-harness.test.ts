import { afterEach, describe, expect, it, vi } from "vitest";
import { createLiveSmokeHarness } from "../scripts/live-smoke-harness.mjs";
import { redactLiveValue, runLiveOperation } from "../scripts/live-smoke-utils.mjs";

describe("live smoke harness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps operation failures with category, retryability, status, redacted context, and cause", async () => {
    const error = Object.assign(new Error("No access for ada@example.com"), { statusCode: 403 });
    const smoke = createLiveSmokeHarness({ finalSummary: "Smoke passed." });

    await expect(smoke.run("messages.send", {
      channelId: "1234567890abcdef12345678",
      email: "ada@example.com",
      apiKey: "pumble_live_abcdefghijklmnopqrstuvwxyz",
    }, async () => {
      throw error;
    })).rejects.toMatchObject({
      message: expect.stringContaining("messages.send failed [permission]"),
      cause: error,
    });

    await expect(smoke.run("messages.send", {
      channelId: "1234567890abcdef12345678",
    }, async () => {
      throw error;
    })).rejects.toThrow("context={\"channelId\":\"<redacted>\"}");
  });

  it("redacts secret-looking keys, email fields, id fields, id arrays, and ids in strings", () => {
    expect(redactLiveValue({
      api_key: "pumble_live_abcdefghijklmnopqrstuvwxyz",
      token: "sk_test_abcdefghijklmnopqrstuvwxyz",
      password: "super secret",
      contactEmail: "ada@example.com",
      nested: {
        ids: ["1234567890abcdef12345678"],
        text: "message 1234567890abcdef12345678 from ada@example.com",
      },
    })).toEqual({
      api_key: "<redacted>",
      token: "<redacted>",
      password: "<redacted>",
      contactEmail: "<redacted>",
      nested: {
        ids: ["<redacted>"],
        text: "message <redacted> from <redacted>",
      },
    });
  });

  it("builds redacted success payloads and prints no raw live ids", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const smoke = createLiveSmokeHarness({ finalSummary: "Facade live smoke passed." });

    const payload = smoke.successPayload({
      channelId: "1234567890abcdef12345678",
      messageId: "abcdefabcdefabcdefabcdef",
      email: "ada@example.com",
    });
    smoke.printSuccess({
      channelId: "1234567890abcdef12345678",
      messageId: "abcdefabcdefabcdefabcdef",
      email: "ada@example.com",
    });

    expect(payload).toEqual({
      ok: true,
      summary: "Facade live smoke passed.",
      ids: {
        channelId: "<redacted>",
        messageId: "<redacted>",
        email: "<redacted>",
      },
    });
    expect(log).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it("cleans up tracked messages in reverse order", async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const smoke = createLiveSmokeHarness({ finalSummary: "Smoke passed." });
    smoke.trackMessage({ channelId: "c1", messageId: "m1" });
    smoke.trackMessage({ channelId: "c2", messageId: "m2" });

    await smoke.cleanup(cleanup);

    expect(cleanup).toHaveBeenNthCalledWith(1, { channelId: "c2", messageId: "m2" });
    expect(cleanup).toHaveBeenNthCalledWith(2, { channelId: "c1", messageId: "m1" });
  });
});

describe("runLiveOperation", () => {
  it("retains the original error as cause", async () => {
    const error = new Error("boom");

    await expect(runLiveOperation("operation.name", {}, async () => {
      throw error;
    })).rejects.toMatchObject({ cause: error });
  });
});
