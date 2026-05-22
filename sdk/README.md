# pumble-sdk

TypeScript SDK, CLI, and MCP server for the Pumble API-Keys add-on.

## Install

```bash
npm install pumble-sdk
```

The package is ESM-only and requires Node.js 20 or newer. CommonJS callers can
load it with `await import("pumble-sdk")`.

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

## Basic SDK Usage

Use the generated client for direct API coverage:

```typescript
const channels = await sdk.channels.listChannels();

const sent = await sdk.messages.sendMessage({
  channelId: channels[0].id,
  text: "Hello from pumble-sdk.",
});

await sdk.messages.sendReply({
  channelId: channels[0].id,
  rootMessageId: sent.id,
  text: "Thread reply from pumble-sdk.",
});
```

Use the hand-written facade for common app flows and safer name/email
resolution:

```typescript
import {
  createPumbleClient,
  findChannelByName,
  findUserByEmail,
} from "pumble-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const channel = await findChannelByName(pumble.raw, "general");
if (!channel) throw new Error("Could not find #general");

const reviewer = await findUserByEmail(pumble.raw, "ada@example.com");
if (!reviewer) throw new Error("Could not find ada@example.com");

await pumble.messages.send({
  channelId: channel.id,
  text: `Review requested from ${reviewer.name}.`,
});
```

## CLI

The package ships a `pumble` binary for one-shot shell use:

```bash
export PUMBLE_API_KEY="<pumble-api-key>"

pumble whoami
pumble channels list
pumble send '#general' "deploy finished"
pumble dm ada@example.com "can you review this?"
pumble search "incident" --limit 5
pumble messages '#general' --limit 10 --json
```

Text output is the default for read commands. Pass `--json` on commands that
support it for scripting. Mutating commands are quiet on success unless you pass
`-v`, `--verbose`, or `--json`.

## MCP Server

`pumble-mcp` starts an MCP server over stdio. The default `curated` profile
keeps message writes behind preview/confirmation tools:

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

Use `readwrite` only when you intentionally want the raw generated write
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

More examples are in [`docs/QUICKSTART.md`](docs/QUICKSTART.md) and
[`examples/`](examples/). Integration guidance is in
[`docs/INTEGRATION-USAGE.md`](docs/INTEGRATION-USAGE.md).
