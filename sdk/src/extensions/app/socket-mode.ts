import type {
  PumbleWebhookBodyByType,
  PumbleWebhookEvent,
  PumbleWebhookEventType,
} from "../webhook-events.js";
import type {
  PumbleEventDispatchResult,
  PumbleEventRouter,
  PumbleEventRouterContext,
} from "./event-router.js";

export const PUMBLE_SOCKET_MODE_PROTOCOL_EVIDENCE = {
  source: "https://github.com/CAKE-com/pumble-node-sdk/blob/master/pumble-sdk/src/core/adapters/socket/AddonWebsocketListener.ts",
  verifiedOn: "2026-05-22",
  verifiedBehavior: "Official source fetches a websocket URL, opens a WebSocket, sends ping, ignores pong, receives JSON frames shaped { payload, correlation_id }, and dispatches PUMBLE_EVENT/APP_EVENT payloads by parsing payload.body.",
} as const;

export type PumbleSocketModeRawMessage = string | Uint8Array | ArrayBuffer;

export interface PumbleSocketModeSocket {
  on(event: string, listener: (data?: unknown) => void | Promise<void>): unknown;
  send(data: string | Uint8Array): void;
  close(): void;
  removeAllListeners?: () => void;
}

export interface PumbleSocketModeFrame {
  correlationId?: string;
  payload: Record<string, unknown>;
}

export interface PumbleSocketModeDispatchResult extends PumbleEventDispatchResult {
  kind: "event" | "pong";
  correlationId?: string;
}

export interface PumbleSocketModeReceiver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  dispatch(rawMessage: PumbleSocketModeRawMessage): Promise<PumbleSocketModeDispatchResult>;
}

type PumbleSocketModeContextFactory<TContext> = (
  event: PumbleWebhookEvent,
  frame: PumbleSocketModeFrame,
) => TContext | Promise<TContext>;

export interface CreatePumbleSocketModeReceiverOptions<TContext = PumbleEventRouterContext> {
  getWebSocketUrl: () => string | Promise<string>;
  router: PumbleEventRouter<TContext>;
  context?: TContext | PumbleSocketModeContextFactory<TContext>;
  createSocket?: (url: string) => PumbleSocketModeSocket;
  onError?: (error: unknown) => void;
  pingIntervalMs?: number;
}

export class PumbleSocketModeUnsupportedError extends Error {
  override readonly name = "PumbleSocketModeUnsupportedError";
}

const DEFAULT_PING_INTERVAL_MS = 25_000;

export function createPumbleSocketModeReceiver<TContext = PumbleEventRouterContext>(
  options: CreatePumbleSocketModeReceiverOptions<TContext>,
): PumbleSocketModeReceiver {
  let socket: PumbleSocketModeSocket | undefined;
  let pingTimer: ReturnType<typeof setInterval> | undefined;

  const receiver: PumbleSocketModeReceiver = {
    async connect() {
      if (socket !== undefined) return;
      if (options.createSocket === undefined) {
        throw new PumbleSocketModeUnsupportedError(
          "Pumble Socket Mode WebSocket transport is not bundled; inject createSocket after choosing a verified WebSocket implementation.",
        );
      }

      const url = await options.getWebSocketUrl();
      const activeSocket = options.createSocket(url);
      socket = activeSocket;

      activeSocket.on("open", () => {
        const intervalMs = options.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS;
        if (intervalMs <= 0) return;
        clearPing();
        pingTimer = setInterval(() => {
          activeSocket.send("ping");
        }, intervalMs);
      });
      activeSocket.on("message", async (data) => {
        try {
          await receiver.dispatch(toRawMessage(data));
        } catch (error) {
          if (options.onError !== undefined) {
            options.onError(error);
            return;
          }
          throw error;
        }
      });
      activeSocket.on("close", () => {
        cleanupSocket(activeSocket);
      });
      activeSocket.on("error", (error) => {
        cleanupSocket(activeSocket);
        options.onError?.(error);
      });
    },

    async disconnect() {
      const activeSocket = socket;
      if (activeSocket === undefined) return;
      cleanupSocket(activeSocket);
      activeSocket.close();
    },

    async dispatch(rawMessage) {
      const text = rawMessageText(rawMessage);
      if (text === "pong") return { kind: "pong", handled: 0 };

      const frame = parseFrame(text);
      const event = eventFromPayload(frame.payload);
      const context = await contextFor(options.context, event, frame);
      const result = await options.router.dispatch(event, context);

      return {
        kind: "event",
        handled: result.handled,
        ...(frame.correlationId !== undefined ? { correlationId: frame.correlationId } : {}),
      };
    },
  };

  function clearPing(): void {
    if (pingTimer !== undefined) {
      clearInterval(pingTimer);
      pingTimer = undefined;
    }
  }

  function cleanupSocket(activeSocket: PumbleSocketModeSocket): void {
    if (socket !== activeSocket) return;
    clearPing();
    socket = undefined;
    activeSocket.removeAllListeners?.();
  }

  return receiver;
}

async function contextFor<TContext>(
  context: CreatePumbleSocketModeReceiverOptions<TContext>["context"],
  event: PumbleWebhookEvent,
  frame: PumbleSocketModeFrame,
): Promise<TContext> {
  if (isContextFactory(context)) {
    return await context(event, frame);
  }
  return (context ?? {}) as TContext;
}

function isContextFactory<TContext>(
  context: CreatePumbleSocketModeReceiverOptions<TContext>["context"],
): context is PumbleSocketModeContextFactory<TContext> {
  return typeof context === "function";
}

function toRawMessage(data: unknown): PumbleSocketModeRawMessage {
  if (typeof data === "string" || data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return data;
  }
  return String(data);
}

function rawMessageText(rawMessage: PumbleSocketModeRawMessage): string {
  if (typeof rawMessage === "string") return rawMessage;
  if (rawMessage instanceof ArrayBuffer) return Buffer.from(rawMessage).toString("utf8");
  return Buffer.from(rawMessage).toString("utf8");
}

function parseFrame(text: string): PumbleSocketModeFrame {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new TypeError("Malformed Pumble Socket Mode frame JSON", { cause });
  }

  if (!isRecord(parsed) || !isRecord(parsed["payload"])) {
    throw new TypeError("Malformed Pumble Socket Mode frame: missing payload");
  }

  const correlationId = parsed["correlation_id"];
  return {
    payload: parsed["payload"],
    ...(typeof correlationId === "string" ? { correlationId } : {}),
  };
}

function eventFromPayload(payload: Record<string, unknown>): PumbleWebhookEvent {
  const messageType = payload["messageType"];
  if (messageType !== "PUMBLE_EVENT" && messageType !== "APP_EVENT") {
    throw new PumbleSocketModeUnsupportedError(
      `Unsupported Pumble Socket Mode messageType: ${String(messageType)}`,
    );
  }

  const eventType = payload["eventType"];
  if (typeof eventType !== "string" || !isKnownEventType(eventType)) {
    throw new TypeError("Malformed Pumble Socket Mode event payload: unknown eventType");
  }

  const body = parseBody(payload["body"]);
  if (!isRecord(body)) {
    throw new TypeError("Malformed Pumble Socket Mode event payload: body must be an object");
  }

  const workspaceId = typeof payload["workspaceId"] === "string"
    ? payload["workspaceId"]
    : workspaceIdFromBody(body);
  const workspaceUserIds = stringArray(payload["workspaceUserIds"]);

  return {
    type: eventType,
    body: body as PumbleWebhookBodyByType[typeof eventType],
    ...(workspaceId !== undefined ? { workspaceId } : {}),
    ...(workspaceUserIds !== undefined ? { workspaceUserIds } : {}),
    raw: payload,
  };
}

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  return JSON.parse(body) as unknown;
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
