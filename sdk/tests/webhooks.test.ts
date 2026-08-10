import { createHmac } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createWebhookHandler } from "../src/extensions/webhooks.js";

const SECRET = "test-signing-secret";
const workspaceId = "aaaaaaaaaaaaaaaaaaaa0000";
const channelId = "bbbbbbbbbbbbbbbbbbbb0001";
const messageId = "cccccccccccccccccccc0001";
const authorId = "aaaaaaaaaaaaaaaaaaaa0001";
const actorId = "aaaaaaaaaaaaaaaaaaaa0002";

function sign(timestamp: string, body: string): string {
  return createHmac("sha256", SECRET)
    .update(`${timestamp}:${body}`)
    .digest("hex");
}

function signedHeaders(body: string, timestamp = String(Date.now())): IncomingHttpHeaders {
  return {
    "content-type": "application/json",
    "x-pumble-request-timestamp": timestamp,
    "x-pumble-request-signature": sign(timestamp, body),
  };
}

function request(body: string, headers: IncomingHttpHeaders): IncomingMessage {
  const req = Readable.from([body]) as IncomingMessage;
  req.headers = headers;
  req.method = "POST";
  req.url = "/hook";
  return req;
}

type CapturedResponse = ServerResponse & {
  body: string;
  ended: boolean;
  headersSeen: Record<string, string>;
};

function response(): CapturedResponse {
  const res = new Writable({
    write(chunk, _encoding, callback) {
      captured.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      callback();
    },
  }) as CapturedResponse;
  const captured = res;
  captured.body = "";
  captured.ended = false;
  captured.statusCode = 200;
  captured.headersSeen = {};
  captured.setHeader = ((name: string, value: number | string | readonly string[]) => {
    captured.headersSeen[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
    return captured;
  }) as CapturedResponse["setHeader"];
  captured.end = ((chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) => {
    if (chunk !== undefined) {
      captured.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    }
    captured.ended = true;
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    cb?.();
    return captured;
  }) as CapturedResponse["end"];
  return captured;
}

const messageBody = {
  ty: "NEW_MESSAGE",
  wId: workspaceId,
  cId: channelId,
  mId: messageId,
  aId: authorId,
  tx: "hello from pumble",
  ts: "2026-05-22T00:00:00Z",
  tsm: 1_779_410_400_000,
  rid: "request-1",
};

describe("createWebhookHandler", () => {
  it("rejects empty signing secrets at construction time", () => {
    expect(() =>
      createWebhookHandler({
        signingSecret: "",
        handlers: {},
      }),
    ).toThrow(/signingSecret/i);
  });

  it("verifies official Pumble headers and dispatches wrapped NEW_MESSAGE events", async () => {
    const onNewMessage = vi.fn();
    const raw = JSON.stringify({
      messageType: "PUMBLE_EVENT",
      eventType: "NEW_MESSAGE",
      workspaceId: messageBody.wId,
      workspaceUserIds: [actorId],
      body: JSON.stringify(messageBody),
    });
    const req = request(raw, signedHeaders(raw));
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: { onNewMessage },
    })(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
    expect(onNewMessage).toHaveBeenCalledWith({
      type: "NEW_MESSAGE",
      body: messageBody,
      workspaceId: messageBody.wId,
      workspaceUserIds: [actorId],
      raw: JSON.parse(raw),
    });
  });

  it("dispatches raw sample-shaped REACTION_ADDED events by the ty discriminator", async () => {
    const onReactionAdded = vi.fn();
    const body = JSON.stringify({
      ty: "REACTION_ADDED",
      wId: messageBody.wId,
      cId: messageBody.cId,
      mId: messageBody.mId,
      mat: messageBody.aId,
      uId: actorId,
      rc: ":white_check_mark:",
      rid: "reaction-request",
    });
    const req = request(body, signedHeaders(body));
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: { onReactionAdded },
    })(req, res);

    expect(res.statusCode).toBe(204);
    expect(onReactionAdded.mock.calls[0]![0]).toMatchObject({
      type: "REACTION_ADDED",
      workspaceId: messageBody.wId,
      body: { rc: ":white_check_mark:" },
    });
  });

  it("returns 401 when the signature is invalid", async () => {
    const body = JSON.stringify(messageBody);
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: { onNewMessage: vi.fn() },
    })(request(body, {
      "x-pumble-request-timestamp": String(Date.now()),
      "x-pumble-request-signature": "bad-signature",
    }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toContain("Invalid Pumble signature");
  });

  it("returns 400 for malformed JSON after signature verification", async () => {
    const body = "{\"not-json\"";
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: {},
    })(request(body, signedHeaders(body)), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toContain("Malformed JSON");
  });

  it("returns 500 and reports handler errors", async () => {
    const thrown = new Error("handler failed");
    const onError = vi.fn();
    const body = JSON.stringify(messageBody);
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: {
        onNewMessage: async () => {
          throw thrown;
        },
      },
      onError,
    })(request(body, signedHeaders(body)), res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain("Webhook handler failed");
    expect(onError).toHaveBeenCalledWith(thrown);
  });

  it("rejects signed deliveries outside the timestamp tolerance", async () => {
    const body = JSON.stringify(messageBody);
    const oldTimestamp = String(Date.now() - 301_000);
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: { onNewMessage: vi.fn() },
    })(request(body, signedHeaders(body, oldTimestamp)), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toContain("stale");
  });

  it("rejects oversized bodies before signature dispatch", async () => {
    const body = JSON.stringify({ ty: "NEW_MESSAGE", tx: "x".repeat(64) });
    const onNewMessage = vi.fn();
    const res = response();

    await createWebhookHandler({
      signingSecret: SECRET,
      handlers: { onNewMessage },
      maxBodyBytes: 16,
    })(request(body, signedHeaders(body)), res);

    expect(res.statusCode).toBe(413);
    expect(res.body).toContain("too large");
    expect(onNewMessage).not.toHaveBeenCalled();
  });
});
