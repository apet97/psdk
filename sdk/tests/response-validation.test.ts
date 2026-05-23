import { describe, expect, it } from "vitest";
import { PumbleSDK } from "../src/index.js";
import { ResponseValidationError } from "../src/models/errors/response-validation-error.js";

describe("response validation", () => {
  it("wraps malformed JSON success responses as ResponseValidationError", async () => {
    const sdk = new PumbleSDK({
      apiKeyAuth: "fixture-key",
      httpClient: {
        request: async () =>
          new Response("{not json", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
    });

    await expect(sdk.users.myInfo({ retries: { strategy: "none" } }))
      .rejects.toBeInstanceOf(ResponseValidationError);
  });

  it("wraps malformed JSON error responses as ResponseValidationError", async () => {
    const sdk = new PumbleSDK({
      apiKeyAuth: "fixture-key",
      httpClient: {
        request: async () =>
          new Response("{not json", {
            status: 403,
            headers: { "content-type": "application/json" },
          }),
      },
    });

    await expect(sdk.users.myInfo({ retries: { strategy: "none" } }))
      .rejects.toBeInstanceOf(ResponseValidationError);
  });
});
