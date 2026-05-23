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

CLI workflows can also read keys from a local file:

```bash
pumble whoami --api-key-file ~/.config/pumble/api-key
```

For error handling, see `docs/ERRORS.md`.

## Install

```bash
npm install pumble-sdk
```

The package is ESM-only. CommonJS callers should use `await import(...)`.

## Create Client

Use the hand-written facade for common app and integration flows:

```typescript
import {
  assertFacadeOk,
  createPumbleClient,
} from "pumble-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const me = await pumble.identity.me();
console.log(`authenticated as ${me.name} <${me.email}>`);
```

The facade groups common operations under `identity`, `channels`, `users`,
`messages`, `scheduled`, and `threads`. The generated SDK remains available as
`pumble.raw`.

For repeated facade writes, exact IDs avoid ambiguity and
`resolverCache: true` can reuse channel and user lists.

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
  console.log(sent.summary);
  console.log(sent.nextActions.join("\n"));
  console.log(sent.choices.map((choice) => choice.label).join("\n"));
  process.exit(1);
}

console.log("message id:", sent.ids.messageId);
```

Keep the returned message ID if you need to fetch, reply, or audit the
message later.

For exception-style flows, `assertFacadeOk(result)` throws with `summary` and
`nextActions` and narrows the result to the success receipt:

```typescript
const receipt = assertFacadeOk(await pumble.messages.send({
  channel: "#general",
  text: "Deploy finished.",
}));

console.log(receipt.ids.messageId);
```

If you want to validate targets before writing, use a preflight:

```typescript
const preflight = await pumble.resolvers.preflight({
  channel: "#general",
  user: "ada@example.com",
});
if (!preflight.ok) {
  if (preflight.channel && !preflight.channel.ok) console.error(preflight.channel.summary);
  if (preflight.user && !preflight.user.ok) console.error(preflight.user.summary);
  process.exit(1);
}
```

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

## Schedule Message

```typescript
const scheduled = await pumble.scheduled.create({
  channel: "#general",
  text: "Deploy reminder",
  sendAt: Date.now() + 60 * 60 * 1000,
});

if (!scheduled.ok) {
  console.error(scheduled.summary);
  process.exit(1);
}

await pumble.scheduled.cancel({
  scheduledMessageId: scheduled.ids.scheduledMessageId,
});
```

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
write surface:

```bash
PUMBLE_API_KEY=... pumble-mcp start --transport stdio --profile readwrite --allow-raw-writes --audit-log ./pumble-mcp-audit.jsonl
```

## Stable Workflow Examples

- Send channel message: `examples/send-channel-by-name.ts`
- DM by email: `examples/dm-by-email.ts`
- Reply to thread: `examples/reply-to-thread.ts`
- Search and reply: `examples/search-and-reply.ts`
- List channels: `examples/list-channels.ts`
- Webhook server: `examples/webhook-server.ts`
- Curated MCP read-only: `examples/mcp-readonly.md`
- Curated MCP preview/confirm writes: `examples/mcp-curated-write.md`
- Add/remove reaction through raw SDK: `examples/add-reaction.ts`
- Schedule/cancel through facade: `examples/schedule-message.ts`

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
