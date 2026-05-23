import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { formatArazzoContextSummary, sanitizeFixtureValue } from "../scripts/record-replay-common.mjs";
import {
  createFixtureKeyId,
  formatReplayMiss,
  loadReplayFixture,
  scanFixtureText,
} from "../scripts/replay-fixtures.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const replayerUrl = pathToFileURL(join(__dirname, "../scripts/replayer.mjs")).href;
const recorderUrl = pathToFileURL(join(__dirname, "../scripts/recorder.mjs")).href;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, canonical(val)]),
    );
  }
  return value;
}

function bodyHash(value: unknown): string {
  const serialised = value === undefined ? "" : JSON.stringify(canonical(value));
  return createHash("sha256").update(serialised).digest("hex");
}

function liveLikeId(suffix: string): string {
  return `1234567890abcdef1234567${suffix}`;
}

describe("record/replay fetch shims", () => {
  let originalFetch: typeof globalThis.fetch;
  let fixtureDir: string;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fixtureDir = mkdtempSync(join(tmpdir(), "pumble-replay-"));
    mkdirSync(join(fixtureDir), { recursive: true });
    process.env["PUMBLE_FIXTURE_DIR"] = fixtureDir;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env["PUMBLE_FIXTURE_DIR"];
    delete process.env["PUMBLE_REPLAY"];
    delete process.env["PUMBLE_RECORD"];
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it("replays a response by method + sorted path + structural body hash", async () => {
    writeFileSync(
      join(fixtureDir, "mini.jsonl"),
      `${JSON.stringify({
        type: "http",
        key: {
          method: "POST",
          path: "/sendMessage?a=1&b=2",
          bodyHash: bodyHash({ z: 1, a: { b: 2, a: 1 } }),
        },
        request: {
          method: "POST",
          path: "/sendMessage?a=1&b=2",
          headers: {},
          body: { a: { a: 1, b: 2 }, z: 1 },
        },
        response: {
          status: 201,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ok: true }),
        },
      })}\n`,
    );
    let passThroughCalls = 0;
    globalThis.fetch = (async () => {
      passThroughCalls++;
      throw new Error("replay should not hit live fetch");
    }) as typeof globalThis.fetch;

    process.env["PUMBLE_REPLAY"] = "mini";
    await import(/* @vite-ignore */ `${replayerUrl}?test=${Date.now()}`);

    const res = await fetch("https://pumble.example.test/sendMessage?b=2&a=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ z: 1, a: { b: 2, a: 1 } }),
    });

    expect(passThroughCalls).toBe(0);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects replay misses loudly without falling through to live fetch", async () => {
    writeFileSync(join(fixtureDir, "empty.jsonl"), "");
    let passThroughCalls = 0;
    globalThis.fetch = (async () => {
      passThroughCalls++;
      return new Response("live");
    }) as typeof globalThis.fetch;

    process.env["PUMBLE_REPLAY"] = "empty";
    await import(/* @vite-ignore */ `${replayerUrl}?test=${Date.now()}`);

    await expect(fetch("https://pumble.example.test/listChannels")).rejects.toThrow(
      /PUMBLE_REPLAY miss/,
    );
    expect(passThroughCalls).toBe(0);
  });

  it("loads replay fixtures through a first-class fixture module", () => {
    const key = {
      method: "POST",
      path: "/sendMessage?a=1&b=2",
      bodyHash: bodyHash({ text: "[redacted]" }),
    };
    writeFileSync(
      join(fixtureDir, "loaded.jsonl"),
      `${JSON.stringify({
        type: "meta",
        name: "arazzo-context",
        value: { channel: "000000000000000000000001" },
      })}\n${JSON.stringify({
        type: "http",
        key,
        response: { status: 200, body: JSON.stringify({ ok: true }) },
      })}\n`,
    );

    const fixture = loadReplayFixture("loaded");

    expect(createFixtureKeyId(key)).toBe(`${key.method}\n${key.path}\n${key.bodyHash}`);
    expect(fixture.meta.get("arazzo-context")).toEqual({
      channel: "000000000000000000000001",
    });
    expect(fixture.entries.get(createFixtureKeyId(key))).toHaveLength(1);
    expect(formatReplayMiss(key)).toBe(
      `PUMBLE_REPLAY miss for POST /sendMessage?a=1&b=2 bodyHash=${key.bodyHash}`,
    );
  });

  it("records sanitized requests and replayable responses", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        id: liveLikeId("a"),
        workspaceId: liveLikeId("4"),
        email: "real.user@customer.invalid",
        name: "Real User",
        text: "private message body",
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": "1234",
          date: "Fri, 22 May 2026 00:00:00 GMT",
          "x-test": "kept",
        },
      })) as typeof globalThis.fetch;

    process.env["PUMBLE_RECORD"] = "recorded";
    await import(/* @vite-ignore */ `${recorderUrl}?test=${Date.now()}`);

    const res = await fetch("https://pumble.example.test/sendMessage", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: "secret-api-key",
        authorization: "Bearer test-token",
        "x-addon-token": "secret-token",
      },
      body: JSON.stringify({
        channelId: liveLikeId("9"),
        text: "hi",
        email: "real.user@customer.invalid",
      }),
    });
    expect(await res.json()).toMatchObject({ email: "real.user@customer.invalid" });

    await (globalThis as typeof globalThis & {
      __PUMBLE_RECORDER_FLUSH__?: () => Promise<void>;
    }).__PUMBLE_RECORDER_FLUSH__?.();

    const lines = readFileSync(join(fixtureDir, "recorded.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      type: "http",
      key: {
        method: "POST",
        path: "/sendMessage",
        bodyHash: bodyHash({
          channelId: "000000000000000000000001",
          text: "[redacted]",
          email: "user-1@example.invalid",
        }),
      },
      request: {
        headers: {
          authorization: "<redacted>",
          apikey: "<redacted>",
          "x-addon-token": "<redacted>",
        },
        body: {
          channelId: "000000000000000000000001",
          text: "[redacted]",
          email: "user-1@example.invalid",
        },
      },
      response: {
        status: 200,
        headers: { "content-type": "application/json", "x-test": "kept" },
        body: JSON.stringify({
          id: "000000000000000000000002",
          workspaceId: "000000000000000000000003",
          text: "[redacted]",
        }),
      },
    });
  });

  it("keeps checked-in fixtures free of obvious secrets and PII", () => {
    for (const fixture of ["arazzo-26-workflows.jsonl", "search-all-live.jsonl"]) {
      const raw = readFileSync(join(__dirname, "fixtures", fixture), "utf8");
      expect(scanFixtureText(fixture, raw)).toEqual([]);
      expect(raw, fixture).not.toMatch(/pmb_[A-Za-z0-9_-]+/);
      expect(raw, fixture).not.toMatch(/[A-Za-z0-9._%+-]+@(?!example\.invalid\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      expect(raw, fixture).not.toMatch(/\b(?!(?:0{20}|a{20}|b{20}|c{20}|d{20})\d{4}\b)[0-9a-f]{24}\b/i);
      expect(raw, fixture).not.toMatch(/alpettest/i);
      expect(raw, fixture).not.toMatch(/Firstname Lastname/i);
      expect(raw, fixture).not.toMatch(/sdk-livetest-\d+/i);
    }
  });

  it("keeps already-minimized placeholder names stable", () => {
    expect(sanitizeFixtureValue({
      channel: {
        id: "000000000000000000000003",
        name: "example-name-49b0b15e",
      },
    })).toEqual({
      channel: {
        id: "000000000000000000000003",
        name: "example-name-49b0b15e",
      },
    });
  });

  it("redacts live arazzo context IDs before logging", () => {
    const summary = formatArazzoContextSummary({
      self: liveLikeId("1"),
      user2: liveLikeId("2"),
      user3: liveLikeId("3"),
      channel: liveLikeId("4"),
      message: liveLikeId("5"),
      scheduled: liveLikeId("6"),
    }, { redactValues: true });

    expect(summary).toBe("self=<redacted> user2=<redacted> user3=<redacted> channel=<redacted> message=<redacted> scheduled=<redacted>");
    expect(summary).not.toMatch(/[0-9a-f]{24}/i);
  });
});
