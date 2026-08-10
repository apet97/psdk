// Fake-timer tests for the `Retry-After` honour path in `withRetries`.
//
// Pre-existing happy-path coverage (default jitter, permanent error,
// maxAttempts, onRetry observer) lives in tests/extensions.test.ts.
// This file isolates the timer-sensitive cases so vi.useFakeTimers()
// doesn't leak setup state to other suites.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withRetries } from "../src/extensions/with-retries.js";
import { PumbleSDKError } from "../src/models/errors/pumble-sdk-error.js";

function makeRateLimitedError(retryAfter: string | null, status = 429): PumbleSDKError {
  const headers = new Headers();
  if (retryAfter !== null) headers.set("retry-after", retryAfter);
  const response = new Response("", { status, headers });
  const request = new Request("https://example.com/sendMessage", { method: "POST" });
  return new PumbleSDKError("Rate limited", { response, request, body: "" });
}

describe("withRetries — Retry-After honour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Retry-After: 0 triggers an effectively-immediate retry", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw makeRateLimitedError("0");
      return "ok";
    });
    const onRetry = vi.fn();
    const p = withRetries(fn, { onRetry, maxAttempts: 3 });
    // Pump pending microtasks + the zero-delay setTimeout that backs
    // the sleep helper.
    await vi.advanceTimersByTimeAsync(0);
    await expect(p).resolves.toBe("ok");
    expect(attempts).toBe(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0]![0]).toMatchObject({ attempt: 1, delayMs: 0 });
  });

  it("Retry-After: 3 waits ~3 seconds before retrying", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw makeRateLimitedError("3");
      return "ok";
    });
    const onRetry = vi.fn();
    const p = withRetries(fn, { onRetry, maxAttempts: 3, maxDelayMs: 10_000 });

    // Drain the first failing call.
    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);
    // 2.9 s is not enough — the retry must still be pending.
    await vi.advanceTimersByTimeAsync(2_900);
    expect(attempts).toBe(1);
    // 100 ms more clears the 3 s mark.
    await vi.advanceTimersByTimeAsync(100);
    await expect(p).resolves.toBe("ok");
    expect(attempts).toBe(2);
    expect(onRetry.mock.calls[0]![0].delayMs).toBe(3_000);
  });

  it("Retry-After is capped at maxDelayMs", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw makeRateLimitedError("60", 503);
      return "ok";
    });
    const onRetry = vi.fn();
    const p = withRetries(fn, { onRetry, maxAttempts: 3, maxDelayMs: 5_000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(p).resolves.toBe("ok");
    expect(onRetry.mock.calls[0]![0].delayMs).toBe(5_000);
  });

  it("ignores Retry-After when respectRetryAfter: false", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw makeRateLimitedError("30");
      return "ok";
    });
    const onRetry = vi.fn();
    const p = withRetries(fn, {
      onRetry,
      maxAttempts: 3,
      baseMs: 10,
      maxDelayMs: 1_000,
      respectRetryAfter: false,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);
    // Without Retry-After respect, the delay is jittered exponential
    // — capped at 1 s here. Pump 1 s and confirm the retry happened
    // (i.e. did not wait 30 s).
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(p).resolves.toBe("ok");
    expect(attempts).toBe(2);
    expect(onRetry.mock.calls[0]![0].delayMs).toBeLessThanOrEqual(1_000);
  });
});
