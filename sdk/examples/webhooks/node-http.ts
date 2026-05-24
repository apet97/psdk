/**
 * Plain Node http server recipe for receiving Pumble webhooks.
 *
 * The SDK already exports a Node `(req, res) => Promise<void>` handler
 * via createWebhookHandler. Mount it on createServer directly.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createWebhookHandler } from "pumble-keys-sdk/extensions/webhooks.js";

export function handler(req: IncomingMessage, res: ServerResponse, signingSecret: string) {
  const webhook = createWebhookHandler({
    signingSecret,
    handlers: {
      NEW_MESSAGE: async (event) => {
        console.log("new message", event.workspaceId);
      },
    },
  });
  return webhook(req, res);
}

if (process.env["RUN_EXAMPLE"] === "node-http") {
  const secret = process.env["PUMBLE_SIGNING_SECRET"];
  if (!secret) throw new Error("PUMBLE_SIGNING_SECRET is required");
  createServer((req, res) => handler(req, res, secret)).listen(3000);
}
