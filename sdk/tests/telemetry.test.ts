// Mocked tests for the telemetry extension.
//
// Covers:
//   - createNoopRecorder is a structural no-op (no throws, no state)
//   - createOTelSpanRecorder degrades to no-op when @opentelemetry/api
//     isn't installed (the case in this repo) — verified by exercising
//     the returned recorder without an OTel SDK present
//   - createJsonlAuditWriter appends well-formed JSONL, one event per
//     line, preserves submission order, never throws into the caller
//     even when the target path is invalid
//   - wrapClient passes calls through transparently, instruments
//     sub-clients lazily, captures status/duration/error class on the
//     emitted event, defaults the args summary to identifier-only

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createJsonlAuditWriter,
  createNoopRecorder,
  createOTelSpanRecorder,
  wrapClient,
} from "../src/extensions/telemetry.js";

describe("createNoopRecorder", () => {
  it("returns spans whose methods are no-ops", () => {
    const recorder = createNoopRecorder();
    const span = recorder.startSpan("op", { extra: 1 });
    expect(() => span.setStatus({ ok: true, statusCode: 200 })).not.toThrow();
    expect(() => span.setAttributes?.({ k: "v" })).not.toThrow();
    expect(() => span.end()).not.toThrow();
  });
});

describe("createOTelSpanRecorder (without @opentelemetry/api installed)", () => {
  it("falls back to a no-op recorder when the module is unavailable", () => {
    // No @opentelemetry/api in this repo's node_modules → recorder must
    // still be usable.
    const recorder = createOTelSpanRecorder({ tracerName: "telemetry-test" });
    const span = recorder.startSpan("test.op");
    expect(() => span.setStatus({ ok: false, statusCode: 500, errorClass: "Boom" })).not.toThrow();
    expect(() => span.end()).not.toThrow();
  });
});

describe("createJsonlAuditWriter", () => {
  let dir: string;
  beforeAll(() => { dir = mkdtempSync(join(tmpdir(), "pumble-telemetry-")); });
  afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

  it("appends one JSON object per line, in submission order", async () => {
    const path = join(dir, "events.jsonl");
    const w = createJsonlAuditWriter(path);
    w.write({ ts: "t1", op: "first", durationMs: 1, statusCode: 200 });
    w.write({ ts: "t2", op: "second", durationMs: 2, statusCode: 404 });
    w.write({ ts: "t3", op: "third", durationMs: 3, statusCode: null });
    await w.flush();
    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(3);
    const parsed = lines.map((l) => JSON.parse(l));
    expect(parsed.map((e: { op: string }) => e.op)).toEqual(["first", "second", "third"]);
    expect(parsed[0]).toMatchObject({ ts: "t1", op: "first", statusCode: 200 });
    expect(parsed[2]).toMatchObject({ statusCode: null });
  });

  it("never throws into the caller when the path is unwritable", async () => {
    // /proc/cant-create-this is unwritable on macOS too (proc is missing
    // entirely). The writer should swallow the error and surface a
    // single stderr warning, not crash the caller.
    const w = createJsonlAuditWriter("/proc/cant-create-this/audit.jsonl");
    expect(() => w.write({ ts: "x", op: "x" })).not.toThrow();
    // flush awaits the in-flight chain; the caught error should not
    // propagate.
    await expect(w.flush()).resolves.toBeUndefined();
  });
});

describe("wrapClient", () => {
  it("transparently forwards method calls and emits one event per call", async () => {
    const events: Array<Record<string, unknown>> = [];
    const fakeWriter = {
      write(e: Record<string, unknown>) { events.push(e); },
      async flush() { /* sync test writer */ },
    };

    const real = {
      async myInfo() {
        return { id: "u1", email: "agent@example.com" };
      },
      messages: {
        async sendMessage(input: { channelId: string; text: string }) {
          return { id: "m1", channelId: input.channelId };
        },
      },
    };

    const wrapped = wrapClient(real, { writer: fakeWriter });
    const me = await wrapped.myInfo();
    expect(me).toEqual({ id: "u1", email: "agent@example.com" });

    const sent = await wrapped.messages.sendMessage({
      channelId: "c1",
      text: "hi",
    });
    expect(sent).toEqual({ id: "m1", channelId: "c1" });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ op: "myInfo", statusCode: null });
    expect(events[1]).toMatchObject({
      op: "messages.sendMessage",
      statusCode: null,
    });
    // args summary keeps only known identifier keys, never the message body.
    const argsEntry = (events[1] as { args: unknown }).args as Array<Record<string, unknown>>;
    expect(argsEntry[0]).toEqual({ channelId: "c1" });
  });

  it("records errors with statusCode and errorClass", async () => {
    const events: Array<Record<string, unknown>> = [];
    class FakeApiError extends Error {
      statusCode = 403;
      constructor(msg: string) {
        super(msg);
        this.name = "FakeApiError";
      }
    }

    const real = {
      messages: {
        async sendMessage(_input: { channelId: string; text: string }) {
          throw new FakeApiError("forbidden");
        },
      },
    };

    const wrapped = wrapClient(real, {
      writer: { write: (e) => events.push(e as Record<string, unknown>), async flush() {} },
    });

    await expect(wrapped.messages.sendMessage({ channelId: "c1", text: "x" })).rejects.toBeInstanceOf(FakeApiError);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      op: "messages.sendMessage",
      statusCode: 403,
      errorClass: "FakeApiError",
    });
  });

  it("returns the same wrapped function on repeated property access", () => {
    const real = { async ping() { return "pong"; } };
    const wrapped = wrapClient(real);
    const a = wrapped.ping;
    const b = wrapped.ping;
    expect(a).toBe(b);
  });

  it("returns a non-function value unchanged after caching", () => {
    const real = { name: "pumble", count: 42, nested: { name: "inner" } };
    const wrapped = wrapClient(real);
    expect(wrapped.name).toBe("pumble");
    expect(wrapped.count).toBe(42);
    // Nested object access returns a stable wrapped proxy.
    expect(wrapped.nested).toBe(wrapped.nested);
    expect(wrapped.nested.name).toBe("inner");
  });

  it("honours shouldRecord to skip instrumentation per op", async () => {
    const events: Array<Record<string, unknown>> = [];
    const real = {
      async loud() { return "noise"; },
      async quiet() { return "ok"; },
    };
    const wrapped = wrapClient(real, {
      writer: { write: (e) => events.push(e as Record<string, unknown>), async flush() {} },
      shouldRecord: (op) => op !== "quiet",
    });
    expect(await wrapped.loud()).toBe("noise");
    expect(await wrapped.quiet()).toBe("ok");
    expect(events.map((e) => e.op)).toEqual(["loud"]);
  });

  it("uses the supplied recorder to emit start + end with status", async () => {
    const calls: Array<{ kind: string; op?: string; status?: unknown }> = [];
    const real = { async hello() { return 1; } };
    const wrapped = wrapClient(real, {
      recorder: {
        startSpan(op) {
          calls.push({ kind: "start", op });
          return {
            end() { calls.push({ kind: "end" }); },
            setStatus(s) { calls.push({ kind: "status", status: s }); },
          };
        },
      },
    });
    await wrapped.hello();
    expect(calls.map((c) => c.kind)).toEqual(["start", "status", "end"]);
    expect(calls[1]).toMatchObject({ kind: "status", status: { ok: true } });
  });

  it("never records message text in the audit writer", async () => {
    const events: Array<Record<string, unknown>> = [];
    const writer = {
      write(event: Record<string, unknown>) {
        events.push(event);
      },
      async flush() {},
    };
    const real = {
      messages: {
        async sendMessage(req: { channelId: string; text: string }) {
          return { ok: true, channelId: req.channelId };
        },
      },
    };
    const wrapped = wrapClient(real, { writer });
    await wrapped.messages.sendMessage({
      channelId: "bbbbbbbbbbbbbbbbbbbb0001",
      text: "top secret payload",
    });
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(JSON.stringify(event)).not.toContain("top secret");
    }
  });
});
