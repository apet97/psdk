// Tests for the token-bucket rate limiter. Uses an injected `now()`
// and a vi.useFakeTimers()-backed setTimeout so the test is fully
// deterministic — no Date.now / performance.now reads, no real wall
// time elapsed.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "../src/extensions/rate-limiter.js";

describe("createRateLimiter", () => {
  let nowMs: number;
  const now = () => nowMs;

  beforeEach(() => {
    nowMs = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid rps / burst", () => {
    expect(() => createRateLimiter({ rps: 0, burst: 1 })).toThrow(/rps must be > 0/);
    expect(() => createRateLimiter({ rps: 5, burst: 0 })).toThrow(/burst must be ≥ 1/);
  });

  it("drains the burst capacity without delay", async () => {
    const limiter = createRateLimiter({ rps: 1, burst: 5, now });
    expect(limiter.available()).toBe(5);
    const results: number[] = [];
    const tasks: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      tasks.push(limiter.limit(async () => { results.push(i); }));
    }
    await vi.advanceTimersByTimeAsync(0);
    await Promise.all(tasks);
    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(limiter.available()).toBeCloseTo(0, 5);
  });

  it("refills at the configured rate", async () => {
    const limiter = createRateLimiter({ rps: 10, burst: 1, now });
    // Drain.
    await limiter.limit(async () => {});
    expect(limiter.available()).toBeCloseTo(0, 5);
    // Advance the clock by 500 ms (5 token-equivalents at 10 rps).
    nowMs += 500;
    // available() also refills, so we should see ~5 tokens but capped
    // at burst=1.
    expect(limiter.available()).toBe(1);
  });

  it("queues concurrent callers and drains them at the refill rate", async () => {
    // rps=2, burst=1 → first caller takes the initial token; the next
    // two should land at +500 ms and +1000 ms once the bucket refills.
    const handles: Array<{ cb: () => void; ms: number; due: number }> = [];
    const limiter = createRateLimiter({
      rps: 2,
      burst: 1,
      now,
      setTimeout: (cb, ms) => {
        const handle = { cb, ms, due: nowMs + ms };
        handles.push(handle);
        return handle;
      },
    });

    const order: string[] = [];
    const p1 = limiter.limit(async () => { order.push("a"); });
    const p2 = limiter.limit(async () => { order.push("b"); });
    const p3 = limiter.limit(async () => { order.push("c"); });

    // Let the synchronous slot drain.
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["a"]);
    expect(handles).toHaveLength(1);

    // Fire the first timer manually to mimic the elapsed clock.
    nowMs = handles[0]!.due;
    handles[0]!.cb();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["a", "b"]);

    // The next drain should have been scheduled for the third caller.
    expect(handles).toHaveLength(2);
    nowMs = handles[1]!.due;
    handles[1]!.cb();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["a", "b", "c"]);

    await Promise.all([p1, p2, p3]);
  });

  it("forwards the wrapped function's return value and propagates throws", async () => {
    const limiter = createRateLimiter({ rps: 10, burst: 5, now });
    expect(await limiter.limit(async () => 42)).toBe(42);
    await expect(limiter.limit(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });

  it("rejects queued callers when maxQueue is full", async () => {
    const limiter = createRateLimiter({ rps: 1, burst: 1, maxQueue: 1, now });

    await limiter.limit(async () => "first");
    const queued = limiter.limit(async () => "queued");
    const rejected = limiter.limit(async () => "rejected");

    await expect(rejected).rejects.toThrow(/queue is full/);
    nowMs += 1000;
    await vi.advanceTimersByTimeAsync(1000);
    await expect(queued).resolves.toBe("queued");
  });

  it("removes aborted queued callers before they run", async () => {
    const ac = new AbortController();
    const limiter = createRateLimiter({ rps: 1, burst: 1, now });

    await limiter.limit(async () => "first");
    const queued = limiter.limit(async () => "queued", { signal: ac.signal });
    ac.abort(new Error("cancelled"));

    await expect(queued).rejects.toThrow("cancelled");
    nowMs += 1000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(limiter.available()).toBe(1);
  });

  it("burst caps at the configured value even after long idle", async () => {
    const limiter = createRateLimiter({ rps: 5, burst: 3, now });
    // Drain the burst.
    await limiter.limit(async () => {});
    await limiter.limit(async () => {});
    await limiter.limit(async () => {});
    expect(limiter.available()).toBeCloseTo(0, 5);
    // Advance clock by 1 hour: would be 18 000 tokens uncapped.
    nowMs += 60 * 60 * 1000;
    expect(limiter.available()).toBe(3);
  });
});
