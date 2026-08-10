import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retry } from "../src/lib/retries.js";

const backoff = {
  initialInterval: 500,
  maxInterval: 10_000,
  exponent: 1.5,
  maxElapsedTime: 60_000,
};

function retryOptions(overrides: Partial<typeof backoff> = {}) {
  return {
    config: {
      strategy: "backoff" as const,
      backoff: { ...backoff, ...overrides },
    },
    statusCodes: ["429"],
  };
}

describe("generated retry backoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("waits at least the initial interval before the first non-Retry-After retry", async () => {
    let attempts = 0;
    const fetchFn = vi.fn(async () => {
      attempts++;
      return new Response("", { status: attempts === 1 ? 429 : 200 });
    });

    const promise = retry(fetchFn, retryOptions());
    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(499);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toMatchObject({ status: 200 });
    expect(attempts).toBe(2);
  });

  it("allows Retry-After: 0 to retry immediately", async () => {
    let attempts = 0;
    const headers = new Headers({ "retry-after": "0" });
    const fetchFn = vi.fn(async () => {
      attempts++;
      return new Response("", {
        status: attempts === 1 ? 429 : 200,
        ...(attempts === 1 ? { headers } : {}),
      });
    });

    const promise = retry(fetchFn, retryOptions());
    await vi.advanceTimersByTimeAsync(0);

    await expect(promise).resolves.toMatchObject({ status: 200 });
    expect(attempts).toBe(2);
  });

  it("caps backoff delay at maxInterval", async () => {
    let attempts = 0;
    const fetchFn = vi.fn(async () => {
      attempts++;
      return new Response("", { status: attempts === 1 ? 429 : 200 });
    });

    const promise = retry(fetchFn, retryOptions({ maxInterval: 300 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(299);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toMatchObject({ status: 200 });
    expect(attempts).toBe(2);
  });
});
