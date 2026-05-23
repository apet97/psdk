# Quickstart

This path gets one useful result at a time: read your identity, resolve a
target, write a message, reply in thread, verify a webhook, and run the MCP
server without exposing unchecked writes.

## Prerequisites

* Node 20 or newer.
* A Pumble API key from **Workspace settings -> API keys**.
* `PUMBLE_API_KEY` exported in your shell.

```bash
export PUMBLE_API_KEY="<pumble-api-key>"
```

Keep API keys in environment variables or a local secret manager. Do not put
them in source files.

## Install

```bash
npm install pumble-sdk
```

The package is ESM-only. CommonJS callers should use `await import(...)`.

## Create Client

Use the hand-written facade for common app and integration flows:

```typescript
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const me = await pumble.identity.me();
console.log(`authenticated as ${me.name} <${me.email}>`);
```

The facade groups common operations under `identity`, `channels`, `users`,
`messages`, and `threads`. The generated SDK remains available as
`pumble.raw`.

## Resolve Channel/User

Resolve names and emails before writes so the write call uses exact IDs:

```typescript
const channel = await pumble.channels.find("#general");
if (!channel.ok) {
  console.log(channel.summary, channel.choices);
  process.exit(1);
}

const reviewer = await pumble.users.find("ada@example.com");
if (!reviewer.ok) {
  console.log(reviewer.summary, reviewer.choices);
  process.exit(1);
}

console.log(channel.channel.id, reviewer.user.id);
```

Pumble does not provide server-side channel-name or user-email search for
these calls; the helpers list once and match client-side.

## Send Message

```typescript
const sent = await pumble.messages.send({
  channel: "#general",
  text: "Hello from pumble-sdk.",
});

if (!sent.ok) {
  console.log(sent.summary, sent.choices);
  process.exit(1);
}

console.log("message id:", sent.ids.messageId);
```

Keep the returned message ID if you need to fetch, reply, or audit the
message later.

## Reply To Thread

```typescript
const reply = await pumble.threads.reply({
  channel: "#general",
  messageId: sent.ids.messageId,
  text: "Thread reply from pumble-sdk.",
});

const thread = await pumble.threads.getContext({
  channelId: sent.ids.channelId,
  messageId: sent.ids.messageId,
  replyLimit: 10,
});

console.log("visible replies:", thread.replies.length, "of", thread.replyCount);
```

`getContext` returns the root message, visible replies, participants, and the
server-reported reply count.

## Verify Webhook

Use `createWebhookHandler` when your app receives signed Pumble callbacks.
Mount it on a raw-body route; Pumble signs `${timestamp}:${rawBody}`.

```typescript
import express from "express";
import { createWebhookHandler } from "pumble-sdk/extensions/index.js";

const app = express();
const webhook = createWebhookHandler({
  signingSecret: process.env["PUMBLE_SIGNING_SECRET"]!,
  maxBodyBytes: 1024 * 1024,
  handlers: {
    onNewMessage: async (event) => {
      console.log(event.workspaceId, event.body.cId, event.body.tx);
    },
  },
});

app.post("/pumble/webhooks", (req, res) => {
  void webhook(req, res);
});
```

The helper verifies `x-pumble-request-timestamp` and
`x-pumble-request-signature`, rejects stale deliveries, rejects malformed JSON,
and returns 500 on handler failure so Pumble can retry.

## Run Curated MCP Readonly

`pumble-mcp` is the MCP package bin. By default, `pumble-mcp start` uses the
curated profile; start there and verify read behavior before enabling any
write flow:

```bash
npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio
```

For hosts that must not expose any write tools, use the
read-only generated profile explicitly:

```bash
npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio \
  --profile readonly
```

Claude Desktop or Cursor config:

```json
{
  "mcpServers": {
    "pumble-read": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk", "--",
        "pumble-mcp", "start",
        "--transport", "stdio",
        "--profile", "readonly"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

## Run Curated MCP Write With Preview/Confirmation

Use the curated profile when writes should require preview first:

```bash
npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio \
  --profile curated
```

Curated message writes are two-step:

* `send_message_preview` -> `send_message_confirmed`
* `reply_to_thread_preview` -> `reply_to_thread_confirmed`

Preview tools do not call Pumble. They return `{ request, preview,
confirmationToken }`. Pass that payload to the confirmed tool to perform the
SDK write. The token is process-local integrity data for the pending preview;
it is not a Pumble credential or a server-side approval record.

Curated read tools return clean envelopes with `{ ok, summary, ids, data,
nextActions }`.

Use `--profile readwrite` only when you intentionally want the raw generated
write surface.

## Live Test Command List

Run the offline gates first:

```bash
cd sdk
npx vitest run tests/docs.test.ts
npm run test:pack
npm run test:arazzo:replay
npm run test:live:replay
```

Run live gates only with sacrificial workspace credentials:

```bash
cd sdk
source /tmp/pumble-livetest.env
npm run test:arazzo
npm run test:live
npm run test:facade:live
npm run test:mcp:live
npm run verify:live
```

`npm run test:pack` builds, packs, installs into a temporary app, and checks
the exported package surface and bins.
