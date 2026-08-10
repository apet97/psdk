import { describe, expect, it } from "vitest";
import { PumbleSDK } from "../src/index.js";
import type { HTTPClient } from "../src/lib/http.js";

const USER_BODY = JSON.stringify({
  id: "000000000000000000000001",
  email: "user-1@example.invalid",
  name: "User 1",
  role: "OWNER",
  status: "ACTIVATED",
  workspaceId: "000000000000000000000002",
  isAddonBot: false,
  isPumbleBot: false,
});

describe("auth header", () => {
  it("sends the configured API key as the ApiKey request header", async () => {
    const key = "pmb_test_1234567890abcdef";
    let captured: Request | undefined;
    const httpClient = {
      request: async (request: Request) => {
        captured = request;
        return new Response(USER_BODY, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    };

    const sdk = new PumbleSDK({ apiKeyAuth: key, httpClient: httpClient as unknown as HTTPClient });
    await sdk.users.myInfo({ retries: { strategy: "none" } });

    expect(captured).toBeDefined();
    expect(captured!.headers.get("ApiKey")).toBe(key);
    expect(captured!.headers.get("Authorization")).toBeNull();
  });
});
