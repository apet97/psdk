import { describe, expect, it, vi } from "vitest";
import {
  categorizeError,
  withRetries,
} from "../src/extensions/index.js";
import { LegacyError } from "../src/models/errors/legacy-error.js";
import { PumbleSDKError } from "../src/models/errors/pumble-sdk-error.js";
import { StructuredError } from "../src/models/errors/structured-error.js";

function httpMeta(status: number, body = "") {
  return {
    response: new Response(body, { status }),
    request: new Request("https://example.com/pumble"),
    body,
  };
}

function sdkError(status: number, body = "") {
  return new PumbleSDKError(`HTTP ${status}`, httpMeta(status, body));
}

describe("categorizeError", () => {
  it.each([
    {
      name: "401 is permission",
      error: sdkError(401),
      expected: { category: "permission", retryable: false, statusCode: 401 },
    },
    {
      name: "403 is permission",
      error: new LegacyError({ error: "Forbidden" }, httpMeta(403, "{\"error\":\"Forbidden\"}")),
      expected: { category: "permission", retryable: false, statusCode: 403 },
    },
    {
      name: "404 is not-found",
      error: sdkError(404),
      expected: { category: "not-found", retryable: false, statusCode: 404 },
    },
    {
      name: "429 is rate-limit",
      error: sdkError(429),
      expected: { category: "rate-limit", retryable: true, statusCode: 429 },
    },
    {
      name: "422 StructuredError is validation",
      error: new StructuredError(
        { message: "Invalid channel", localizedMessage: "Invalid channel", code: 1204 },
        httpMeta(422, "{\"message\":\"Invalid channel\",\"localizedMessage\":\"Invalid channel\",\"code\":1204}"),
      ),
      expected: { category: "validation", retryable: false, statusCode: 422 },
    },
    {
      name: "503 is transient",
      error: sdkError(503),
      expected: { category: "transient", retryable: true, statusCode: 503 },
    },
  ])("$name", ({ error, expected }) => {
    expect(categorizeError(error)).toMatchObject(expected);
  });

  it("preserves structured error metadata", () => {
    const error = new StructuredError(
      { message: "Bad custom status", localizedMessage: "Localized bad custom status", code: 7001 },
      httpMeta(400, "{\"message\":\"Bad custom status\",\"localizedMessage\":\"Localized bad custom status\",\"code\":7001}"),
    );

    expect(categorizeError(error)).toMatchObject({
      category: "validation",
      message: "Bad custom status",
      localizedMessage: "Localized bad custom status",
      code: 7001,
      raw: error,
    });
  });

  it("treats common network transport failures as transient", () => {
    const error = new Error("socket reset") as Error & { code: string };
    error.code = "ECONNRESET";

    expect(categorizeError(error)).toMatchObject({
      category: "transient",
      retryable: true,
      statusCode: null,
      message: "socket reset",
    });
  });

  it("falls back to unknown for unrecognized errors", () => {
    const raw = { surprise: true };

    expect(categorizeError(raw)).toEqual({
      category: "unknown",
      retryable: false,
      statusCode: null,
      message: "Unknown error",
      raw,
    });
  });

  it("uses categorized retryability as withRetries' default", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const call = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw sdkError(503);
      return "ok";
    });

    const promise = withRetries(call, { maxAttempts: 2, baseMs: 10, maxDelayMs: 10 });
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe("ok");
    expect(attempts).toBe(2);
    vi.useRealTimers();
  });

  it("does not retry categorized validation errors by default", async () => {
    let attempts = 0;
    await expect(withRetries(async () => {
      attempts++;
      throw new StructuredError(
        { message: "Invalid payload", localizedMessage: "Invalid payload", code: 4001 },
        httpMeta(422),
      );
    }, { maxAttempts: 3, baseMs: 1 })).rejects.toThrow("Invalid payload");

    expect(attempts).toBe(1);
  });
});
