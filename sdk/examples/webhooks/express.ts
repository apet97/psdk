/**
 * Express recipe for receiving Pumble webhooks.
 *
 * Pumble signs the raw request body. Do NOT mount express.json() before
 * this route — let createWebhookHandler read the raw stream itself.
 *
 * Usage:
 *   import express from "express";
 *   import { makeRouter } from "./express";
 *
 *   const app = express();
 *   app.use("/", makeRouter({ signingSecret: process.env.PUMBLE_SIGNING_SECRET! }));
 *   app.listen(3000);
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createWebhookHandler } from "pumble-sdk/extensions/webhooks.js";

type ExpressRouterLike = {
  post(
    path: string,
    handler: (req: IncomingMessage, res: ServerResponse) => unknown,
  ): unknown;
};

export function makeRouter(
  options: { signingSecret: string },
  router?: ExpressRouterLike,
) {
  const webhook = createWebhookHandler({ signingSecret: options.signingSecret });
  if (router) {
    router.post("/pumble", (req, res) => webhook(req, res));
    return router;
  }
  // Return a request-handler suitable for `app.use("/pumble", ...)`.
  return (req: IncomingMessage, res: ServerResponse) => webhook(req, res);
}
