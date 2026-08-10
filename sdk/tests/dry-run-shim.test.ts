// Tests for the dry-run fetch shim. Imports the shim with PUMBLE_DRY_RUN=1
// then verifies that mutating methods get intercepted while reads pass
// through (mocking real fetch with a known sentinel).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("dry-run-shim", () => {
  let originalFetch: typeof globalThis.fetch;
  let auditDir: string;
  let auditPath: string;
  let auditBaseline: number;

  beforeAll(async () => {
    originalFetch = globalThis.fetch;
    auditDir = mkdtempSync(join(tmpdir(), "pumble-dry-run-shim-"));
    auditPath = join(auditDir, "dry-run.jsonl");
    process.env["PUMBLE_DRY_RUN"] = "1";
    process.env["PUMBLE_DRY_RUN_LOG"] = auditPath;
    globalThis.fetch = (async () =>
      new Response("sentinel upstream", {
        status: 299,
        headers: { "content-type": "text/plain" },
      })) as unknown as typeof globalThis.fetch;
    // Re-import the shim per test by jiggling the cache key — bun
    // caches ESM imports per URL, so we'd have to use ?bust=... if we
    // ever needed to load fresh. For these tests one import is enough.
    await import("../bin/dry-run-shim.mjs");
    auditBaseline = readAuditCount();
  });

  function readAuditCount(): number {
    try {
      const raw = readFileSync(auditPath, "utf8");
      if (raw.length === 0) return 0;
      return raw.trim().split("\n").length;
    } catch {
      return 0;
    }
  }

  afterAll(async () => {
    await flushAudit();
    globalThis.fetch = originalFetch;
    delete process.env["PUMBLE_DRY_RUN"];
    delete process.env["PUMBLE_DRY_RUN_LOG"];
    rmSync(auditDir, { recursive: true, force: true });
  });

  it("intercepts POST and returns synthetic MessageRef for /sendMessage", async () => {
    const res = await fetch("https://example.com/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: "x", text: "hi" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: expect.any(String), channelId: expect.any(String) });
  });

  it("intercepts DELETE and returns ack for /deleteMessage", async () => {
    const res = await fetch("https://example.com/deleteMessage?messageId=abc", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("intercepts createChannel and returns ChannelRef", async () => {
    const res = await fetch("https://example.com/createChannel", {
      method: "POST",
      body: JSON.stringify({ name: "x", type: "PUBLIC" }),
    });
    const body = await res.json();
    expect(body).toMatchObject({ id: expect.any(String), name: expect.any(String) });
  });

  it("intercepts createScheduledMessage and returns ScheduledMessageRef", async () => {
    const res = await fetch("https://example.com/createScheduledMessage", {
      method: "POST",
      body: JSON.stringify({ channelId: "x", text: "y", sendAt: 1 }),
    });
    const body = await res.json();
    expect(body).toMatchObject({ id: expect.any(String), channelId: expect.any(String) });
  });

  it("intercepts editScheduledMessage and returns full ScheduledMessage", async () => {
    const res = await fetch("https://example.com/editScheduledMessage", {
      method: "POST",
      body: JSON.stringify({ scheduledMessageId: "x" }),
    });
    const body = await res.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      channelId: expect.any(String),
      workspaceId: expect.any(String),
      author: expect.any(String),
      sendAt: expect.any(Number),
    });
  });

  it("GET passes through to the upstream fetch without real network", async () => {
    const res = await fetch("https://example.com/listChannels");
    expect(res.status).toBe(299);
    const text = await res.text();
    expect(text).toBe("sentinel upstream");
  });

  it("appends one JSONL entry per intercepted mutation when PUMBLE_DRY_RUN_LOG is set", async () => {
    await flushAudit();
    const before = readAuditCount();
    await fetch("https://example.com/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: "audit-c", text: "audit-t" }),
    });
    await fetch("https://example.com/deleteMessage?messageId=m1", { method: "DELETE" });
    await flushAudit();
    // Give the chained fs.appendFile promise a tick to land. The shim
    // writes are queued; the test polls for ≤ 1s.
    for (let i = 0; i < 50 && readAuditCount() - before < 2; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    const after = readAuditCount();
    expect(after - before).toBeGreaterThanOrEqual(2);
    expect(statSync(auditPath).size).toBeGreaterThan(0);
    const lines = readFileSync(auditPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const last = lines.slice(-2);
    expect(last[0]).toMatchObject({
      method: "POST",
      path: "/sendMessage",
      requestBody: { channelId: "audit-c", text: "[redacted]" },
      syntheticBody: expect.objectContaining({ id: expect.any(String), channelId: expect.any(String) }),
    });
    expect(last[1]).toMatchObject({
      method: "DELETE",
      path: "/deleteMessage",
      syntheticBody: { status: "ok" },
    });
    // ts is a parseable ISO-8601 string.
    expect(() => new Date(last[0].ts).toISOString()).not.toThrow();
    expect(auditBaseline).toBeGreaterThanOrEqual(0); // captured at setup
  });
});

function flushAudit(): Promise<void> {
  return (globalThis as typeof globalThis & {
    __PUMBLE_DRY_RUN_FLUSH__?: () => Promise<void>;
  }).__PUMBLE_DRY_RUN_FLUSH__?.() ?? Promise.resolve();
}
