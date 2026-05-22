// Token-bucket rate limiter for outbound SDK calls.
//
// Designed to sit *inside* `withRetries` so each retry attempt
// acquires its own token:
//
//   const limiter = createRateLimiter({ rps: 5, burst: 10 });
//   await withRetries(() => limiter.limit(() => sdk.messages.sendMessage(...)));
//
// In-process only. Multi-process rate limiting would need a shared
// store (Redis, etc.) and is out of scope.

/** Options for {@link createRateLimiter}. */
export interface RateLimiterOptions {
  /** Steady-state refill rate, tokens per second. Must be > 0. */
  rps: number;
  /**
   * Maximum tokens the bucket can hold. The bucket starts full at
   * `burst`, so the first `burst` callers acquire immediately. Must
   * be ≥ 1.
   */
  burst: number;
  /**
   * Maximum number of callers allowed to wait for a future token.
   * Defaults to unlimited.
   */
  maxQueue?: number;
  /**
   * Monotonic clock source. Defaults to `performance.now()`. Override
   * for deterministic tests.
   */
  now?: () => number;
  /**
   * `setTimeout` source. Defaults to the global. Override when running
   * in environments where the global can't be patched cleanly (or to
   * inject a fake-timer harness in tests).
   */
  setTimeout?: (cb: () => void, ms: number) => unknown;
}

export interface RateLimiter {
  /**
   * Wait for a token, then invoke `fn`. Returns whatever `fn`
   * resolves to (or throws what `fn` throws). The limiter does not
   * count token consumption against the eventual outcome — a
   * failing call still costs a token.
   */
  limit<T>(fn: () => Promise<T> | T, options?: LimitOptions): Promise<T>;
  /**
   * Current available tokens (after the implicit refill). Inspect-
   * only — for tests and dashboards.
   */
  available(): number;
}

export interface LimitOptions {
  signal?: AbortSignal;
}

interface Waiter {
  resolve: () => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal | undefined;
  onAbort?: (() => void) | undefined;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  if (!(options.rps > 0)) {
    throw new RangeError(`createRateLimiter: rps must be > 0, got ${options.rps}`);
  }
  if (!(options.burst >= 1)) {
    throw new RangeError(`createRateLimiter: burst must be ≥ 1, got ${options.burst}`);
  }
  const rps = options.rps;
  const burst = options.burst;
  const maxQueue = options.maxQueue ?? Number.POSITIVE_INFINITY;
  if (!(maxQueue >= 0)) {
    throw new RangeError(`createRateLimiter: maxQueue must be >= 0, got ${maxQueue}`);
  }
  const now = options.now ?? (() => performance.now());
  const setT = options.setTimeout ?? ((cb: () => void, ms: number) => setTimeout(cb, ms));

  let tokens = burst;
  let lastRefill = now();
  const queue: Waiter[] = [];
  let drainHandle: unknown = null;

  function refill(): void {
    const t = now();
    const elapsed = (t - lastRefill) / 1000;
    if (elapsed <= 0) return;
    tokens = Math.min(burst, tokens + elapsed * rps);
    lastRefill = t;
  }

  function tryDrain(): void {
    drainHandle = null;
    refill();
    while (tokens >= 1 && queue.length > 0) {
      tokens -= 1;
      const waiter = queue.shift() as Waiter;
      if (waiter.signal && waiter.onAbort) {
        waiter.signal.removeEventListener("abort", waiter.onAbort);
      }
      waiter.resolve();
    }
    if (queue.length > 0) scheduleDrain();
  }

  function scheduleDrain(): void {
    if (drainHandle !== null || queue.length === 0) return;
    refill();
    const tokensNeeded = Math.max(0, 1 - tokens);
    const waitMs = Math.max(0, Math.ceil((tokensNeeded / rps) * 1000));
    drainHandle = setT(tryDrain, waitMs);
  }

  function abortReason(signal: AbortSignal): unknown {
    return (signal as AbortSignal & { reason?: unknown }).reason ?? new Error("rate limiter wait aborted");
  }

  function acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      return Promise.reject(abortReason(signal));
    }
    refill();
    if (tokens >= 1) {
      tokens -= 1;
      return Promise.resolve();
    }
    if (queue.length >= maxQueue) {
      return Promise.reject(new Error("rate limiter queue is full"));
    }
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal };
      if (signal) {
        waiter.onAbort = () => {
          const idx = queue.indexOf(waiter);
          if (idx !== -1) queue.splice(idx, 1);
          reject(abortReason(signal));
        };
        signal.addEventListener("abort", waiter.onAbort, { once: true });
      }
      queue.push(waiter);
      scheduleDrain();
    });
  }

  return {
    async limit<T>(fn: () => Promise<T> | T, limitOptions: LimitOptions = {}): Promise<T> {
      await acquire(limitOptions.signal);
      return await fn();
    },
    available(): number {
      refill();
      return tokens;
    },
  };
}
