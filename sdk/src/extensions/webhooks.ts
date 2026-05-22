import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import {
  type AppUnauthorizedEvent,
  type AppUninstalledEvent,
  type ChannelCreatedEvent,
  type NewMessageEvent,
  type NotificationAppUnauthorized,
  type NotificationAppUninstalled,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationReaction,
  type NotificationWorkspaceUserJoined,
  type PumbleWebhookBodyByType,
  type PumbleWebhookEvent,
  type PumbleWebhookEventType,
  type ReactionEvent,
  type UpdatedMessageEvent,
  type WorkspaceUserJoinedEvent,
} from "./webhook-events.js";

export const PUMBLE_REQUEST_TIMESTAMP_HEADER = "x-pumble-request-timestamp";
export const PUMBLE_REQUEST_SIGNATURE_HEADER = "x-pumble-request-signature";

export interface WebhookHandlers {
  onNewMessage?: (event: NewMessageEvent) => void | Promise<void>;
  onUpdatedMessage?: (event: UpdatedMessageEvent) => void | Promise<void>;
  onReactionAdded?: (event: ReactionEvent) => void | Promise<void>;
  onChannelCreated?: (event: ChannelCreatedEvent) => void | Promise<void>;
  onAppUninstalled?: (event: AppUninstalledEvent) => void | Promise<void>;
  onAppUnauthorized?: (event: AppUnauthorizedEvent) => void | Promise<void>;
  onWorkspaceUserJoined?: (event: WorkspaceUserJoinedEvent) => void | Promise<void>;
}

export interface CreateWebhookHandlerOptions {
  signingSecret: string;
  handlers: WebhookHandlers;
  onError?: (e: unknown) => void;
  /**
   * Reject signed deliveries older/newer than this many seconds.
   * Default: 300 seconds.
   */
  timestampToleranceSeconds?: number;
  /**
   * Maximum accepted raw request body size in bytes.
   * Default: 1 MiB.
   */
  maxBodyBytes?: number;
  /**
   * Injectable clock for deterministic tests.
   */
  now?: () => number;
}

class BodyTooLargeError extends Error {
  override readonly name = "BodyTooLargeError";
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

interface PumbleEventEnvelope {
  messageType?: string;
  eventType?: string;
  workspaceId?: unknown;
  workspaceUserIds?: unknown;
  body?: unknown;
  [key: string]: unknown;
}

export function createWebhookHandler(options: CreateWebhookHandlerOptions) {
  if (typeof options.signingSecret !== "string" || options.signingSecret.trim().length === 0) {
    throw new TypeError("createWebhookHandler: signingSecret must be a non-empty string");
  }
  const toleranceMs = (options.timestampToleranceSeconds ?? 300) * 1000;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  if (!(Number.isFinite(maxBodyBytes) && maxBodyBytes > 0)) {
    throw new RangeError(`createWebhookHandler: maxBodyBytes must be > 0, got ${maxBodyBytes}`);
  }
  const now = options.now ?? Date.now;

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let rawBody: string;
    try {
      rawBody = await readRequestBody(req, maxBodyBytes);
    } catch (e) {
      if (e instanceof BodyTooLargeError) {
        sendText(res, 413, "Pumble webhook body too large");
        return;
      }
      throw e;
    }

    const signatureResult = verifyPumbleSignature({
      headers: req.headers,
      rawBody,
      signingSecret: options.signingSecret,
      toleranceMs,
      now,
    });
    if (!signatureResult.ok) {
      sendText(res, 401, signatureResult.message);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      sendText(res, 400, "Malformed JSON body");
      return;
    }

    let event: PumbleWebhookEvent | null;
    try {
      event = normalizeWebhookEvent(parsed);
    } catch {
      sendText(res, 400, "Malformed Pumble event body");
      return;
    }
    if (event === null) {
      sendText(res, 400, "Unsupported Pumble webhook payload");
      return;
    }

    try {
      await dispatchEvent(event, options.handlers);
      sendNoContent(res);
    } catch (e) {
      try {
        options.onError?.(e);
      } catch {
        // Keep the webhook response tied to the original handler failure.
      }
      sendText(res, 500, "Webhook handler failed");
    }
  };
}

async function readRequestBody(req: IncomingMessage, maxBodyBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
    totalBytes += buf.byteLength;
    if (totalBytes > maxBodyBytes) {
      throw new BodyTooLargeError("Pumble webhook body too large");
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function verifyPumbleSignature(options: {
  headers: IncomingHttpHeaders;
  rawBody: string;
  signingSecret: string;
  toleranceMs: number;
  now: () => number;
}): { ok: true } | { ok: false; message: string } {
  const timestamp = headerValue(options.headers, PUMBLE_REQUEST_TIMESTAMP_HEADER);
  const signature = headerValue(options.headers, PUMBLE_REQUEST_SIGNATURE_HEADER);
  if (timestamp === null || signature === null) {
    return { ok: false, message: "Invalid Pumble signature: missing timestamp or signature" };
  }

  const timestampMs = parseTimestampMs(timestamp);
  if (timestampMs === null) {
    return { ok: false, message: "Invalid Pumble signature: bad timestamp" };
  }
  if (Math.abs(options.now() - timestampMs) > options.toleranceMs) {
    return { ok: false, message: "Invalid Pumble signature: stale timestamp" };
  }

  const expected = createHmac("sha256", options.signingSecret)
    .update(`${timestamp}:${options.rawBody}`)
    .digest("hex");
  if (!timingSafeHexEqual(signature, expected)) {
    return { ok: false, message: "Invalid Pumble signature" };
  }
  return { ok: true };
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

function parseTimestampMs(timestamp: string): number | null {
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric)) return null;
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function timingSafeHexEqual(actualHex: string, expectedHex: string): boolean {
  const actual = actualHex.trim();
  if (!/^[0-9a-f]+$/i.test(actual)) return false;
  if (actual.length !== expectedHex.length) return false;
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function normalizeWebhookEvent(payload: unknown): PumbleWebhookEvent | null {
  if (!isRecord(payload)) return null;

  const envelope = payload as PumbleEventEnvelope;
  if (typeof envelope.eventType === "string" && isKnownEventType(envelope.eventType)) {
    const body = parseEnvelopeBody(envelope.body);
    if (!isRecord(body)) return null;
    const workspaceId = typeof envelope.workspaceId === "string" ? envelope.workspaceId : workspaceIdFromBody(body);
    const workspaceUserIds = stringArray(envelope.workspaceUserIds);
    return eventFor(envelope.eventType, body, payload, {
      ...(workspaceId !== undefined ? { workspaceId } : {}),
      ...(workspaceUserIds !== undefined ? { workspaceUserIds } : {}),
    });
  }

  if (typeof payload["ty"] === "string" && isKnownEventType(payload["ty"])) {
    const workspaceId = workspaceIdFromBody(payload);
    return eventFor(
      payload["ty"],
      payload,
      payload,
      workspaceId !== undefined ? { workspaceId } : {},
    );
  }

  return null;
}

function parseEnvelopeBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  return JSON.parse(body) as unknown;
}

function eventFor<T extends PumbleWebhookEventType>(
  type: T,
  body: Record<string, unknown>,
  raw: unknown,
  metadata: { workspaceId?: string; workspaceUserIds?: string[] },
): PumbleWebhookEvent<T> {
  return {
    type,
    body: body as PumbleWebhookBodyByType[T],
    ...(metadata.workspaceId !== undefined ? { workspaceId: metadata.workspaceId } : {}),
    ...(metadata.workspaceUserIds !== undefined ? { workspaceUserIds: metadata.workspaceUserIds } : {}),
    raw,
  };
}

async function dispatchEvent(event: PumbleWebhookEvent, handlers: WebhookHandlers): Promise<void> {
  switch (event.type) {
    case "NEW_MESSAGE":
      await handlers.onNewMessage?.(event as PumbleWebhookEvent<"NEW_MESSAGE">);
      return;
    case "UPDATED_MESSAGE":
      await handlers.onUpdatedMessage?.(event as PumbleWebhookEvent<"UPDATED_MESSAGE">);
      return;
    case "REACTION_ADDED":
      await handlers.onReactionAdded?.(event as PumbleWebhookEvent<"REACTION_ADDED">);
      return;
    case "CHANNEL_CREATED":
      await handlers.onChannelCreated?.(event as PumbleWebhookEvent<"CHANNEL_CREATED">);
      return;
    case "APP_UNINSTALLED":
      await handlers.onAppUninstalled?.(event as PumbleWebhookEvent<"APP_UNINSTALLED">);
      return;
    case "APP_UNAUTHORIZED":
      await handlers.onAppUnauthorized?.(event as PumbleWebhookEvent<"APP_UNAUTHORIZED">);
      return;
    case "WORKSPACE_USER_JOINED":
      await handlers.onWorkspaceUserJoined?.(event as PumbleWebhookEvent<"WORKSPACE_USER_JOINED">);
      return;
  }
}

function isKnownEventType(value: string): value is PumbleWebhookEventType {
  return value === "NEW_MESSAGE"
    || value === "UPDATED_MESSAGE"
    || value === "REACTION_ADDED"
    || value === "CHANNEL_CREATED"
    || value === "APP_UNINSTALLED"
    || value === "APP_UNAUTHORIZED"
    || value === "WORKSPACE_USER_JOINED";
}

function workspaceIdFromBody(body: Record<string, unknown>): string | undefined {
  const compact = body["wId"];
  if (typeof compact === "string") return compact;
  const full = body["workspace"];
  return typeof full === "string" ? full : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every(item => typeof item === "string")
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

function sendText(res: ServerResponse, statusCode: number, body: string): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(body);
}

export type {
  AppUnauthorizedEvent,
  AppUninstalledEvent,
  ChannelCreatedEvent,
  NewMessageEvent,
  NotificationAppUnauthorized,
  NotificationAppUninstalled,
  NotificationChannel,
  NotificationMessage,
  NotificationReaction,
  NotificationWorkspaceUserJoined,
  PumbleWebhookEvent,
  PumbleWebhookEventType,
  ReactionEvent,
  UpdatedMessageEvent,
  WorkspaceUserJoinedEvent,
};
