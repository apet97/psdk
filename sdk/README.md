# pumble-keys-sdk

Pumble TypeScript SDK / Developer Toolkit generated with Speakeasy for the Pumble API-Keys add-on.

Use it when you want a typed raw SDK plus safer Pumble workflows: facade-first channel/user/message helpers, CLI commands, curated MCP tools, webhook verification, redaction, replay/live testing, and release verification.

This package is not a general generator for SDKs. The generated raw SDK comes from `PumbleOpenApi.yaml`; the handwritten layers make Pumble API-key workflows safer and more ergonomic than raw endpoints.

[![npm version](https://img.shields.io/npm/v/pumble-keys-sdk.svg)](https://www.npmjs.com/package/pumble-keys-sdk)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What this is

A **Pumble TypeScript SDK / Developer Toolkit**: one generated raw client from `PumbleOpenApi.yaml`, plus handwritten façade, webhooks, CLI, and curated MCP for Pumble specifically.

## What this is not

- A general generator for SDKs (use Stainless or Speakeasy for that — see [`../docs/product/sdk-generator-product-boundary.md`](../docs/product/sdk-generator-product-boundary.md)).
- A multi-language code generator.
- A hosted control plane for arbitrary OpenAPI specs.

## Install

```bash
npm install pumble-keys-sdk
```

The package is ESM-only and requires Node.js 20 or newer. CommonJS callers can
load it with `await import("pumble-keys-sdk")`.

Runtime support: Node.js 20+ ESM. Browser and edge runtimes are not supported in `0.3.x`.

Surface stability is listed in [`docs/STABILITY.md`](docs/STABILITY.md).
Error handling is covered in [`docs/ERRORS.md`](docs/ERRORS.md).
Support and API surfaces are listed in [`docs/SUPPORT.md`](docs/SUPPORT.md)
and [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md).
Migration notes are in [`docs/MIGRATING.md`](docs/MIGRATING.md).
Redacted release proof for `0.3.21`: [`docs/verification/v0.3.21.md`](docs/verification/v0.3.21.md).

## First run

The façade is the recommended entry point. It accepts human-friendly inputs
(channel names, emails) and returns structured receipts.

```ts
import {
  assertFacadeOk,
  createPumbleClient,
} from "pumble-keys-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const sent = await pumble.messages.send({
  channel: "#general",
  text: "hello",
});
const receipt = assertFacadeOk(sent);
console.log(receipt.ids.messageId);
```

Need raw endpoint access? See [Raw SDK Usage](#raw-sdk-usage) below.

## Stable, Beta, Experimental

| Surface | Status | Use for |
| --- | --- | --- |
| `pumble-keys-sdk` raw SDK | Stable | Direct typed endpoint access generated from `PumbleOpenApi.yaml`. |
| `pumble-keys-sdk/extensions/index.js` facade | Stable | Resolver-first users, channels, messages, threads, search, and scheduled-message workflows. |
| `pumble-keys-sdk/extensions/webhooks.js` | Stable | Signed webhook verification and routing helpers. |
| Curated MCP profile | Stable | Agent-facing read tools and preview/confirm writes. |
| `pumble-keys-sdk/extensions/telemetry.js` | Beta | Local telemetry hooks and examples. |
| `pumble-keys-sdk/extensions/testing/index.js` | Beta | Replay fixtures and test helpers. |
| `pumble-keys-sdk/extensions/app/*` and Socket Mode | Experimental | App/OAuth/socket helpers that are not a complete production app framework. |

## Authentication

Create a Pumble API key in **Workspace settings -> API keys** and pass it as
`apiKeyAuth`:

```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const sdk = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const me = await sdk.users.myInfo();
console.log(me.id, me.name);
```

The generated client also accepts `serverURL` when you need to point at a
different Pumble API-Keys base URL.

## Facade-First SDK Usage

Use the hand-written facade for normal application flows. It accepts human
inputs, resolves them to exact IDs, and returns structured receipts instead of
making callers stitch together raw endpoint responses:

```typescript
import {
  assertFacadeOk,
  createPumbleClient,
} from "pumble-keys-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const sent = await pumble.messages.send({
  channel: "#general",
  text: "Hello from pumble-keys-sdk.",
});
assertFacadeOk(sent);

const dm = await pumble.messages.dm({
  user: "ada@example.com",
  text: "Can you review this?",
});

const search = await pumble.search.recent({
  query: "incident",
  limit: 5,
});

// Full search walks: use `pumble.search.all(...)` (`searchAllMessages`) —
// it handles same-second overlap, dedupes by message ID, and respects aborts.
for await (const hit of pumble.search.all({ text: "incident" })) {
  console.log(hit.id);
}
```

If a name or email is ambiguous, write helpers return choices and do not call
Pumble. Use the summary for logs or UI copy, show `nextActions`, and present
choices by `choice.label`:

```typescript
const result = await pumble.messages.send({
  channel: "gen",
  text: "Hello from pumble-keys-sdk.",
});

if (!result.ok) {
  console.error(result.summary);
  for (const action of result.nextActions) console.error(action);
  for (const choice of result.choices) console.error(choice.label);
  process.exit(1);
}
```

Resolver lists are uncached by default. Opt in per client when repeated facade
calls should reuse one channel/user list per client instance:

```typescript
const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
  resolverCache: { enabled: true, ttlMs: 60_000 },
});

await pumble.resolvers.refresh();
console.log(pumble.resolvers.cacheInfo());
await pumble.resolvers.preflight({ channel: "#general", user: "ada@example.com" });
pumble.resolvers.clearCache();
```

`resolverCache` defaults to `false`. Use `resolverCache: true` for one in-memory channel/user list per client, or `resolverCache: { enabled: true, ttlMs: 60_000 }` when large workspaces need bounded refresh. Exact IDs remain the fastest hot path because they avoid resolver scans and ambiguity checks. Use manual `refresh()` and `clearCache()` when you need to preload or discard cached resolver lists.

## Raw SDK Usage

Use `PumbleSDK` or `pumble.raw` when you need direct generated API coverage:

```typescript
const entries = await pumble.raw.channels.listChannels();
const channelId = entries[0].channel.id;

await pumble.raw.messages.sendMessage({
  channelId,
  text: "Raw endpoint call.",
});
```

Use `client.scheduled` for scheduled messages when you want target resolution
and printable receipts:

```typescript
const client = pumble;
const scheduled = await client.scheduled.create({
  channel: "#ops",
  text: "Deploy reminder",
  sendAt: Date.now() + 60 * 60 * 1000,
});

if (!scheduled.ok) {
  console.error(scheduled.summary);
  process.exit(1);
}

await client.scheduled.cancel({
  scheduledMessageId: scheduled.ids.scheduledMessageId,
});
```

Keep the raw escape hatch as `client.raw.scheduledMessages` for direct endpoint access.

## CLI

The package ships a `pumble-keys` binary for one-shot shell use:

```bash
export PUMBLE_API_KEY="<pumble-api-key>"

pumble-keys --help
pumble-keys whoami --api-key-file ~/.config/pumble/api-key
pumble-keys whoami --api-key-stdin
pumble-keys whoami
pumble-keys channels list
pumble-keys channels find general
pumble-keys users find ada@example.com
pumble-keys send '#general' "deploy finished"
pumble-keys dm ada@example.com "can you review this?"
pumble-keys search "incident" --limit 5
pumble-keys messages '#general' --limit 10 --json
pumble-keys thread <message-id> --channel '#general' --json
```

Text output is the default for read commands. Pass `--json` on commands that
support it for scripting. Mutating commands are quiet on success unless you pass
`-v`, `--verbose`, or `--json`.
Prefer `PUMBLE_API_KEY`, `--api-key-file`, or `--api-key-stdin` over command-line keys. Legacy direct key flags can leak through shell history, process listings, CI logs, and terminal recordings.

## MCP Server

`pumble-keys-mcp` starts an MCP server over stdio. The default `curated` profile
exposes the task-oriented tools (`whoami`, `find_channel`, `find_user`,
`list_channels`, `search_messages`, `get_channel_context`,
`get_thread_context`) and keeps writes behind preview/confirmation tools:

```bash
pumble-keys-mcp start --help

npx -y --package pumble-keys-sdk -- pumble-keys-mcp start \
  --transport stdio \
  --profile curated
```

Use `readonly` when a host must not expose mutating tools:

```bash
npx -y --package pumble-keys-sdk -- pumble-keys-mcp start \
  --transport stdio \
  --profile readonly
```

Use `readwrite` only when you intentionally want the raw generated endpoint
surface, and require an audit log:

```bash
PUMBLE_API_KEY=... pumble-keys-mcp start --transport stdio --profile readwrite --allow-raw-writes --audit-log ./pumble-keys-mcp-audit.jsonl
```

Do not expose this to agents you do not control. The curated profile is the
default for a reason — see [`docs/MCP-SAFETY.md`](docs/MCP-SAFETY.md) for the
full safety profile matrix.

SSE is for local HTTP clients. Bind to localhost and require a bearer token:

```bash
npx -y --package pumble-keys-sdk -- pumble-keys-mcp start \
  --transport sse \
  --host 127.0.0.1 \
  --auth-token "$PUMBLE_MCP_TOKEN"
```

Example MCP client config:

```json
{
  "mcpServers": {
    "PumbleSDK": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-keys-sdk", "--",
        "pumble-keys-mcp", "start",
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

## Webhooks

`createWebhookHandler` verifies signed Pumble callbacks and dispatches typed
handlers from a raw-body route:

```typescript
import express from "express";
import { createWebhookHandler } from "pumble-keys-sdk/extensions/index.js";

const app = express();
const webhook = createWebhookHandler({
  signingSecret: process.env["PUMBLE_SIGNING_SECRET"]!,
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

Do not put `express.json()` in front of this route; Pumble signs the raw body.

## Testing

Offline verification:

```bash
cd sdk
npm run verify:offline
npm run test:pack
```

Live verification uses sacrificial workspace credentials:

```bash
cd sdk
source /tmp/pumble-livetest.env
npm run verify:live
```

`verify:live` runs `npm run build`, Arazzo live tests, search live tests, the
direct facade live smoke, and the curated MCP live smoke. The individual live
smokes are available as `npm run test:facade:live` and `npm run test:mcp:live`.

`npm run test:pack` builds the SDK, runs `npm pack`, installs the tarball into a
temporary app, and checks the exported package surface and bins.

## Package Notes

- The npm package includes `bin/`, `esm/`, `src/`, and the public docs under
  `docs/`.
- Tests, scripts, examples, `.speakeasy`, `package-lock.json`, and source maps
  are excluded from the npm tarball.
- Generated SDK code lives under `src/sdk/`, `src/models/`, `src/funcs/`,
  `src/lib/`, `src/hooks/`, and `src/mcp-server/tools/`.
- Hand-written helpers live under `src/extensions/`, `bin/`, `docs/`,
  `examples/`, `scripts/`, and `tests/`.
- Package split planning is tracked in
  [`docs/PACKAGE-SPLIT.md`](docs/PACKAGE-SPLIT.md). This repository currently publishes one package: `pumble-keys-sdk`.

## Stable Workflow Examples

- Send channel message: [`examples/send-channel-by-name.ts`](examples/send-channel-by-name.ts)
- DM by email: [`examples/dm-by-email.ts`](examples/dm-by-email.ts)
- Reply to thread: [`examples/reply-to-thread.ts`](examples/reply-to-thread.ts)
- Search and reply: [`examples/search-and-reply.ts`](examples/search-and-reply.ts)
- List channels: [`examples/list-channels.ts`](examples/list-channels.ts)
- Webhook server: [`examples/webhook-server.ts`](examples/webhook-server.ts)
- Curated MCP read-only: [`examples/mcp-readonly.md`](examples/mcp-readonly.md)
- Curated MCP preview/confirm writes: [`examples/mcp-curated-write.md`](examples/mcp-curated-write.md)
- Add/remove reaction through raw SDK: [`examples/add-reaction.ts`](examples/add-reaction.ts)
- Schedule/cancel through facade: [`examples/schedule-message.ts`](examples/schedule-message.ts)

More examples are in [`docs/QUICKSTART.md`](docs/QUICKSTART.md). Repository examples live in the source tree under `examples/`.
They are not included in the npm tarball. Integration guidance is in
[`docs/INTEGRATION-USAGE.md`](docs/INTEGRATION-USAGE.md).
