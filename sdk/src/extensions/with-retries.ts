// Transient-error retry wrapper. The generated SDK has its own
// `retryConfig` for backoff on operations marked with retries in the
// spec, but not every operation opts in — and `retryConfig` ignores
// the difference between "transient" (5xx, ECONNRESET) and
// "permanent" (4xx, auth, malformed body).
//
// This wrapper is a small belt-and-braces around any SDK call (or any
// promise-returning function): it retries on transient errors with
// configurable jittered backoff, and re-throws permanent errors
// untouched.

import { categorizeError } from "./categorize-error.js";
import { PumbleSDKError } from "../models/errors/pumble-sdk-error.js";

export interface RetryOptions {
  /**
   * Maximum number of attempts (initial try counts). Default 3.
   */
  maxAttempts?: number;
  /**
   * Base delay in milliseconds for the exponential backoff. The actual
   * delay is `baseMs * 2^attempt * jitter(0.5..1.5)`. Default 250 ms.
   */
  baseMs?: number;
  /**
   * Cap on the per-attempt delay regardless of exponent. Default 8 s.
   */
  maxDelayMs?: number;
  /**
   * Status codes to retry on. Default: 408, 425, 429, 500, 502, 503, 504.
   */
  retryStatuses?: number[];
  /**
   * Override the "is this transient" judgement entirely. Receives the
   * raw error; return true to retry. When provided, `retryStatuses` is
   * ignored.
   */
  isRetryable?: (error: unknown, attempt: number) => boolean;
  /**
   * When the wrapped error is a 429 or 503 with a `Retry-After` header,
   * use that value (delta-seconds or HTTP-date) as the next delay
   * instead of the jittered exponential backoff. The chosen delay is
   * still capped at `maxDelayMs`. Default true.
   */
  respectRetryAfter?: boolean;
  /**
   * Optional observer fired before each retry sleep.
   */
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
  /**
   * AbortSignal — when aborted, the sleep is cancelled and the abort
   * reason is thrown (not the wrapped function's error).
   */
  signal?: AbortSignal;
}

const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504];

class AbortError extends Error {
  override readonly name = "AbortError";
}

function defaultIsRetryable(error: unknown, retryStatuses: number[]): boolean {
  const categorized = categorizeError(error);
  if (!categorized.retryable) return false;
  return categorized.statusCode === null || retryStatuses.includes(categorized.statusCode);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      const reason = (signal as AbortSignal & { reason?: unknown }).reason;
      reject(reason instanceof Error ? reason : new AbortError(String(reason ?? "aborted")));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      const reason = (signal as AbortSignal & { reason?: unknown })?.reason;
      reject(reason instanceof Error ? reason : new AbortError(String(reason ?? "aborted")));
    };
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

/**
 * Wrap a thunk in retry-on-transient-error behaviour.
 *
 *   const result = await withRetries(() => sdk.messages.sendMessage({ ... }));
 *
 * Permanent errors (auth, validation, 4xx other than 408/425/429) are
 * thrown immediately. Transient errors and network blips trigger
 * exponential-backoff retry up to `maxAttempts` times.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseMs = options.baseMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 8_000;
  const retryStatuses = options.retryStatuses ?? DEFAULT_RETRY_STATUSES;
  const respectRetryAfter = options.respectRetryAfter ?? true;
  const isRetryable = options.isRetryable
    ?? ((e: unknown) => defaultIsRetryable(e, retryStatuses));

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const more = attempt + 1 < maxAttempts;
      if (!more || !isRetryable(e, attempt)) throw e;

      // Honour `Retry-After` on 429/503 when present; otherwise fall
      // back to jittered exponential backoff. Either way the delay is
      // capped at `maxDelayMs`.
      const retryAfterMs = respectRetryAfter ? extractRetryAfter(e) : null;
      let delayMs: number;
      if (retryAfterMs !== null) {
        delayMs = Math.min(maxDelayMs, Math.max(0, retryAfterMs));
      } else {
        const jitter = 0.5 + Math.random();
        delayMs = Math.min(maxDelayMs, baseMs * 2 ** attempt * jitter);
      }
      options.onRetry?.({ attempt: attempt + 1, delayMs, error: e });
      await sleep(delayMs, options.signal);
    }
  }
  // Unreachable — the loop either returns or throws — but TypeScript
  // wants a terminal statement.
  throw lastError;
}

/**
 * Pull a delay (ms) out of an error's `Retry-After` header, when it's
 * a `PumbleSDKError` carrying a 429 or 503. Returns null when the
 * header is absent or unparseable.
 */
function extractRetryAfter(error: unknown): number | null {
  if (!(error instanceof PumbleSDKError)) return null;
  if (error.statusCode !== 429 && error.statusCode !== 503) return null;
  const raw = error.headers.get("retry-after");
  if (raw === null) return null;
  return parseRetryAfter(raw);
}

/**
 * Parse an HTTP `Retry-After` header per RFC 7231 §7.1.3 — either
 * delta-seconds (`"3"`) or HTTP-date (`"Wed, 21 Oct 2015 07:28:00 GMT"`).
 * Returns null when the value can't be interpreted; the caller falls
 * back to backoff in that case.
 */
function parseRetryAfter(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return seconds * 1000;
  }
  const target = Date.parse(trimmed);
  if (Number.isNaN(target)) return null;
  return target - Date.now();
}
