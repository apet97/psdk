/**
 * Fastify recipe for receiving Pumble webhooks.
 *
 * Fastify exposes the underlying Node req/res via `request.raw` / `reply.raw`.
 * Skip Fastify's JSON content-type parser for the webhook route so the raw
 * body is available for signature verification.
 *
 * Usage:
 *   import Fastify from "fastify";
 *   import { fastifyPumbleWebhook } from "./fastify";
 *
 *   const app = Fastify();
 *   await fastifyPumbleWebhook(app, { signingSecret: process.env.PUMBLE_SIGNING_SECRET! });
 *   await app.listen({ port: 3000 });
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createWebhookHandler } from "pumble-sdk/extensions/webhooks.js";

type FastifyLike = {
  post(
    path: string,
    handler: (
      request: { raw: IncomingMessage },
      reply: { raw: ServerResponse },
    ) => unknown,
  ): unknown;
};

export function fastifyPumbleWebhook(
  app: FastifyLike,
  options: { signingSecret: string },
) {
  const webhook = createWebhookHandler({ signingSecret: options.signingSecret });
  app.post("/pumble", async (request, reply) => {
    await webhook(request.raw, reply.raw);
  });
}
