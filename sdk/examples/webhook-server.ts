import express from "express";
import { createWebhookHandler } from "pumble-sdk/extensions/index.js";

const signingSecret = process.env["PUMBLE_SIGNING_SECRET"];
if (!signingSecret) {
  throw new Error("PUMBLE_SIGNING_SECRET is required");
}

const app = express();

// Do not mount express.json() before this route. Pumble signs the raw
// request body, and createWebhookHandler reads that raw stream itself.
const pumbleWebhook = createWebhookHandler({
  signingSecret,
  handlers: {
    onNewMessage: async (event) => {
      console.log("new message", {
        workspaceId: event.workspaceId,
        channelId: event.body.cId,
        messageId: event.body.mId,
        authorId: event.body.aId,
        text: event.body.tx,
      });
    },
    onReactionAdded: async (event) => {
      console.log("reaction added", {
        workspaceId: event.workspaceId,
        channelId: event.body.cId,
        messageId: event.body.mId,
        userId: event.body.uId,
        reaction: event.body.rc,
      });
    },
  },
  onError: (e) => {
    console.error("Pumble webhook handler failed", e);
  },
});

app.post("/pumble/webhooks", (req, res) => {
  void pumbleWebhook(req, res);
});

const port = Number.parseInt(process.env["PORT"] ?? "3000", 10);
app.listen(port, () => {
  console.log(`Pumble webhook server listening on :${port}`);
});
