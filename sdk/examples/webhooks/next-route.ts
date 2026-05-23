/**
 * Next.js route-handler recipe for receiving Pumble webhooks.
 *
 * Next route handlers run on the WHATWG `Request` API, not Node IncomingMessage.
 * The Pumble signing helpers live inside createWebhookHandler — we re-implement
 * the minimal verification here against the same headers Pumble sends.
 *
 * Usage: place this file at `app/api/pumble/route.ts` in a Next app.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP_HEADER = "x-pumble-request-timestamp";
const SIGNATURE_HEADER = "x-pumble-request-signature";
const TOLERANCE_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const secret = process.env["PUMBLE_SIGNING_SECRET"];
  if (!secret) return Response.json({ ok: false, error: "missing secret" }, { status: 500 });

  const rawBody = await request.text();
  const timestamp = request.headers.get(TIMESTAMP_HEADER) ?? "";
  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > TOLERANCE_MS) {
    return Response.json({ ok: false, error: "stale timestamp" }, { status: 401 });
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
  ) {
    return Response.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as { messageType?: string };
  return Response.json({ ok: true, type: event.messageType });
}
