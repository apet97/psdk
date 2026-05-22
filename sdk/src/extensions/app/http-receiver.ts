import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";

export type PumbleWebhookRawBody = string | Uint8Array;

export interface PumbleWebhookHttpResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export type PumbleNodeWebhookHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

export async function handleRawWebhook(
  rawBody: PumbleWebhookRawBody,
  headers: IncomingHttpHeaders,
  handler: PumbleNodeWebhookHandler,
): Promise<PumbleWebhookHttpResult> {
  const req = rawBodyRequest(rawBody, headers);
  const res = capturedResponse();

  await handler(req, res);

  return {
    status: res.statusCode,
    body: res.body,
    headers: { ...res.headersSeen },
  };
}

type CapturedResponse = ServerResponse & {
  body: string;
  headersSeen: Record<string, string>;
};

function rawBodyRequest(rawBody: PumbleWebhookRawBody, headers: IncomingHttpHeaders): IncomingMessage {
  const req = Readable.from([rawBody]) as IncomingMessage;
  req.headers = normalizeHeaders(headers);
  req.method = "POST";
  req.url = "/";
  return req;
}

function normalizeHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
  const normalized: IncomingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    normalized[name.toLowerCase()] = value;
  }
  return normalized;
}

function capturedResponse(): CapturedResponse {
  const res = new Writable({
    write(chunk, _encoding, callback) {
      captured.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      callback();
    },
  }) as CapturedResponse;
  const captured = res;
  captured.body = "";
  captured.statusCode = 200;
  captured.headersSeen = {};
  const serverResponse = captured as ServerResponse;
  serverResponse.setHeader = ((name: string, value: number | string | readonly string[]) => {
    captured.headersSeen[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
    return captured;
  }) as ServerResponse["setHeader"];
  serverResponse.end = ((chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) => {
    if (chunk !== undefined) {
      captured.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    }
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    cb?.();
    return captured;
  }) as ServerResponse["end"];
  return captured;
}
