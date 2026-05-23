import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(
  resolve(__dirname, "..", "docs", "RETRIES-TIMEOUTS-RATE-LIMITS.md"),
  "utf8",
);

describe("retries / timeouts / rate-limit contract", () => {
  it("documents the no-retry-on-writes default", () => {
    expect(text).toMatch(/writes.*not retry|writes do not retry/i);
  });

  it("documents Retry-After honoring on reads", () => {
    expect(text).toMatch(/Retry-After/);
  });

  it("documents createRateLimiter as process-local", () => {
    expect(text).toMatch(/createRateLimiter/);
    expect(text).toMatch(/process-local/i);
  });

  it("documents withRetries opt-in for writes", () => {
    expect(text).toMatch(/withRetries/);
  });
});
