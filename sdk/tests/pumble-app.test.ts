import { createHmac } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { PumbleApp } from "../src/extensions/index.js";

const SECRET = "test-signing-secret";

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
  req.url = "/pumble/webhooks";
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

describe("PumbleApp", () => {
  it("chains event registrations and dispatches verified raw webhooks through the router", async () => {
    const app = new PumbleApp({ signingSecret: SECRET });
    const onNewMessage = vi.fn();
    const rawBody = JSON.stringify({
      ty: "NEW_MESSAGE",
      wId: "workspace-1",
      cId: "channel-1",
      mId: "message-1",
      aId: "author-1",
      tx: "hello from pumble",
    });

    expect(app.event("NEW_MESSAGE", onNewMessage)).toBe(app);

    const result = await app.handleWebhook(rawBody, signedHeaders(rawBody));

    expect(result).toEqual({
      status: 204,
      body: "",
      headers: {},
    });
    expect(onNewMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "NEW_MESSAGE",
        workspaceId: "workspace-1",
        body: expect.objectContaining({ tx: "hello from pumble" }),
      }),
      {},
    );
  });

  it("verifies the exact raw body before JSON parsing", async () => {
    const app = new PumbleApp({ signingSecret: SECRET });
    const onNewMessage = vi.fn();
    const rawBody = "{\n  \"ty\":\"NEW_MESSAGE\",\n  \"wId\":\"workspace-1\",\n  \"tx\":\"spacing matters\"\n}";
    const compactBody = JSON.stringify(JSON.parse(rawBody));
    app.event("NEW_MESSAGE", onNewMessage);

    const result = await app.handleWebhook(rawBody, signedHeaders(compactBody));

    expect(result.status).toBe(401);
    expect(result.body).toContain("Invalid Pumble signature");
    expect(onNewMessage).not.toHaveBeenCalled();
  });

  it("returns handler failures as webhook errors", async () => {
    const onError = vi.fn();
    const app = new PumbleApp({ signingSecret: SECRET, onError });
    const thrown = new Error("handler failed");
    const rawBody = JSON.stringify({
      ty: "NEW_MESSAGE",
      tx: "boom",
    });
    app.event("NEW_MESSAGE", () => {
      throw thrown;
    });

    const result = await app.handleWebhook(rawBody, signedHeaders(rawBody));

    expect(result.status).toBe(500);
    expect(result.body).toContain("Webhook handler failed");
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      message: expect.stringContaining("NEW_MESSAGE"),
      cause: thrown,
    });
  });

  it("creates an Express-compatible raw stream handler without importing Express", async () => {
    const app = new PumbleApp({ signingSecret: SECRET });
    const onReactionAdded = vi.fn();
    const handler = app
      .event("REACTION_ADDED", onReactionAdded)
      .createExpressHandler();
    const rawBody = JSON.stringify({
      ty: "REACTION_ADDED",
      wId: "workspace-1",
      cId: "channel-1",
      mId: "message-1",
      uId: "user-1",
      rc: ":white_check_mark:",
    });
    const res = response();

    await handler(request(rawBody, signedHeaders(rawBody)), res);

    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
    expect(onReactionAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "REACTION_ADDED",
        body: expect.objectContaining({ rc: ":white_check_mark:" }),
      }),
      {},
    );
  });
});
