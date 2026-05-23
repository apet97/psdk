import { describe, expect, it } from "vitest";
import { PumbleSDK } from "../src/index.js";
import {
  redactDebugHeaders,
  redactDebugValue,
} from "../src/extensions/debug-redaction.js";

describe("debug redaction", () => {
  it("redacts auth headers, emails, live ids, signatures, and message text", () => {
    expect(redactDebugHeaders(new Headers({
      ApiKey: "pmb_live_secret",
      Authorization: "Bearer token",
      "x-pumble-signature": "sig",
      "content-type": "application/json",
    }))).toEqual({
      apikey: "<redacted>",
      authorization: "<redacted>",
      "x-pumble-signature": "<redacted>",
      "content-type": "application/json",
    });

    expect(redactDebugValue({
      channelId: "1234567890abcdef12345678",
      email: "person@company.com",
      text: "private message",
      nested: { token: "abc", body: "hello person@company.com" },
    })).toEqual({
      channelId: "<redacted>",
      email: "<redacted>",
      text: "<redacted>",
      nested: { token: "<redacted>", body: "hello <redacted>" },
    });
  });

  it("does not print api keys or message bodies through generated debug logging", async () => {
    const logs: string[] = [];
    const debugLogger = {
      group: (label?: string) => logs.push(String(label ?? "")),
      groupEnd: () => undefined,
      log: (message: unknown, ...args: unknown[]) => {
        logs.push([message, ...args].map(String).join(" "));
      },
    };
    const httpClient = {
      request: async () =>
        new Response(JSON.stringify({ id: "1234567890abcdef12345678", channelId: "abcdefabcdefabcdefabcdef" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    };
    const sdk = new PumbleSDK({ apiKeyAuth: "pmb_live_secret", debugLogger, httpClient });

    await sdk.messages.sendMessage({ channelId: "1234567890abcdef12345678", text: "private body" }, {
      retries: { strategy: "none" },
    });

    const joined = logs.join("\n");
    expect(joined).not.toContain("pmb_live_secret");
    expect(joined).not.toContain("private body");
    expect(joined).not.toMatch(/\b[0-9a-f]{24}\b/i);
  });
});
