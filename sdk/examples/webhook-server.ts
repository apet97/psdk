import express from "express";
import { PumbleApp } from "pumble-sdk/extensions/index.js";

const signingSecret = process.env["PUMBLE_SIGNING_SECRET"];
if (!signingSecret) {
  throw new Error("PUMBLE_SIGNING_SECRET is required");
}

const app = express();

// Do not mount express.json() before this route. Pumble signs the raw
// request body, and PumbleApp reads that raw stream itself.
const pumble = new PumbleApp({
  signingSecret,
  onError: (e) => {
    console.error("Pumble webhook handler failed", e);
  },
})
  .event("NEW_MESSAGE", async (event) => {
    console.log("new message", {
      workspaceId: event.workspaceId,
      channelId: event.body.cId,
      messageId: event.body.mId,
      authorId: event.body.aId,
      text: event.body.tx,
    });
  })
  .event("REACTION_ADDED", async (event) => {
    console.log("reaction added", {
      workspaceId: event.workspaceId,
      channelId: event.body.cId,
      messageId: event.body.mId,
      userId: event.body.uId,
      reaction: event.body.rc,
    });
  });

app.post("/pumble/webhooks", pumble.createExpressHandler());

const port = Number.parseInt(process.env["PORT"] ?? "3000", 10);
app.listen(port, () => {
  console.log(`Pumble webhook server listening on :${port}`);
});
