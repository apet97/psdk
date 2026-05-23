# pumble-sdk

TypeScript SDK, CLI, and MCP server for the Pumble API-Keys add-on.

## Install

```bash
npm install pumble-sdk
```

The package is ESM-only and requires Node.js 20 or newer. CommonJS callers can
load it with `await import("pumble-sdk")`.

Surface stability is listed in [`docs/STABILITY.md`](docs/STABILITY.md).
Error handling is covered in [`docs/ERRORS.md`](docs/ERRORS.md).
Support and API surfaces are listed in [`docs/SUPPORT.md`](docs/SUPPORT.md)
and [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md).

## Authentication

Create a Pumble API key in **Workspace settings -> API keys** and pass it as
`apiKeyAuth`:

```typescript
import { PumbleSDK } from "pumble-sdk";

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
} from "pumble-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const sent = await pumble.messages.send({
  channel: "#general",
  text: "Hello from pumble-sdk.",
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
```

If a name or email is ambiguous, write helpers return choices and do not call
Pumble. Use the summary for logs or UI copy, show `nextActions`, and present
choices by `choice.label`:

```typescript
const result = await pumble.messages.send({
  channel: "gen",
  text: "Hello from pumble-sdk.",
});

if (!result.ok) {
  console.error(result.summary);
  for (const action of result.nextActions) console.error(action);
  for (const choice of result.choices) console.error(choice.label);
  process.exit(1);
}
```

Resolver lists are uncached by default. Opt in per client when repeated facade
calls should reuse one channel list and one user list per client instance:

```typescript
const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
  resolverCache: true,
});

await pumble.resolvers.refresh();
console.log(pumble.resolvers.cacheInfo());
await pumble.resolvers.preflight({ channel: "#general", user: "ada@example.com" });
pumble.resolvers.clearCache();
```

`resolverCache` defaults to `false`. When enabled, it keeps one in-memory
`listChannels` result and one in-memory `listUsers` result per client instance.
There is no TTL, persistence, background refresh, or hidden invalidation except
that a failed list promise is cleared so the next facade call can retry.

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

Scheduled messages are raw-only today. Use `pumble.raw.scheduledMessages`
until the facade adds target resolution or receipt behavior for that surface.

## CLI

The package ships a `pumble` binary for one-shot shell use:

```bash
export PUMBLE_API_KEY="<pumble-api-key>"

pumble whoami
pumble channels list
pumble channels find general
pumble users find ada@example.com
pumble send '#general' "deploy finished"
pumble dm ada@example.com "can you review this?"
pumble search "incident" --limit 5
pumble messages '#general' --limit 10 --json
pumble thread <message-id> --channel '#general' --json
```

Text output is the default for read commands. Pass `--json` on commands that
support it for scripting. Mutating commands are quiet on success unless you pass
`-v`, `--verbose`, or `--json`.

## MCP Server

`pumble-mcp` starts an MCP server over stdio. The default `curated` profile
exposes the task-oriented tools (`whoami`, `find_channel`, `find_user`,
`list_channels`, `search_messages`, `get_channel_context`,
`get_thread_context`) and keeps writes behind preview/confirmation tools:

```bash
npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio \
  --profile curated
```

Use `readonly` when a host must not expose mutating tools:

```bash
npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio \
  --profile readonly
```

Use `readwrite` only when you intentionally want the raw generated endpoint
surface.

Example MCP client config:

```json
{
  "mcpServers": {
    "PumbleSDK": {
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

## Webhooks

`createWebhookHandler` verifies signed Pumble callbacks and dispatches typed
handlers from a raw-body route:

```typescript
import express from "express";
import { createWebhookHandler } from "pumble-sdk/extensions/index.js";

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
  [`docs/PACKAGE-SPLIT.md`](docs/PACKAGE-SPLIT.md). This repository currently publishes one package: `pumble-sdk`.

More examples are in [`docs/QUICKSTART.md`](docs/QUICKSTART.md). Repository
examples live in the source tree under `examples/`. They are not included in
the npm tarball. Integration guidance is in
[`docs/INTEGRATION-USAGE.md`](docs/INTEGRATION-USAGE.md).
