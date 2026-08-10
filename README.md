# pumble-keys-sdk

> Pumble TypeScript SDK / Developer Toolkit generated with Speakeasy for the Pumble API-Keys add-on.

[![npm version](https://img.shields.io/npm/v/pumble-keys-sdk.svg)](https://www.npmjs.com/package/pumble-keys-sdk)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Disclaimer** — This is an independent, personal open-source project. It is not affiliated with, endorsed by, or sponsored by CAKE.com Inc. or Pumble. "Pumble" and "CAKE.com" are trademarks of their respective owners.

A typed client plus safer, agent-friendly workflows for the **Pumble API-Keys add-on**. One generated raw SDK from `PumbleOpenApi.yaml`, wrapped in a handwritten façade, CLI, curated MCP server, and webhook tooling — so scripting a Pumble workspace, or letting an agent operate inside one, is ergonomic and hard to get wrong.

## Features

- **Typed raw SDK** — generated from `PumbleOpenApi.yaml`, covering the API-Keys surface.
- **Façade** — `createPumbleClient(...)` resolves channels and users by name and returns *values, not exceptions* (`{ ok: true, ... }` / `{ ok: false, reason, ... }`), so agents branch instead of wrapping every call in try/catch.
- **CLI** — `pumble-keys` for one-off workspace scripting.
- **Curated MCP server** — `pumble-keys-mcp`, a compact agent-facing tool surface with preview/confirm writes and a read-only profile.
- **Webhooks** — signature verification and typed event dispatch.
- **Built for safety** — secret redaction, replay + live testing, and a release-verification gate.

## Install

```bash
npm install pumble-keys-sdk
```

Requires Node.js 20+ (ESM only). Create an API key in Pumble under *Workspace settings → API keys*.

## Quick start

Raw SDK — direct typed endpoint access:

```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const sdk = new PumbleSDK({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

const me = await sdk.users.myInfo();
console.log(me.id, me.name);
```

Façade — recommended for agents, because failures are values you can branch on:

```typescript
import { createPumbleClient } from "pumble-keys-sdk/extensions/index.js";

const pumble = createPumbleClient({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

const sent = await pumble.messages.send({ channel: "#general", text: "hello" });
if (sent.ok) {
  console.log("sent", sent.ids.messageId);
} else {
  console.error(sent.reason, sent.summary); // no throw — inspect and recover
}
```

## MCP server

Run the curated, agent-facing server over stdio (read-only profile shown):

```bash
npx -y --package pumble-keys-sdk -- pumble-keys-mcp start \
  --transport stdio \
  --profile readonly
```

The curated profile previews and confirms writes rather than exposing the full
endpoint surface. See [MCP safety profiles](sdk/docs/MCP-SAFETY.md) for the
`curated` / `readwrite` / `--dry-run` modes and the bundled knowledge resources.

## Product boundary

This SDK targets the **Pumble API-Keys add-on** — the static `ApiKey` header
issued from *Workspace settings → API keys*. Reach for it to script your own
workspace from a server, or to let an agent operate inside it.

For building **Pumble apps** (OAuth install flow, slash commands, shortcuts,
modals/views, Socket Mode), use CAKE.com's official `pumble-sdk` instead:
[`pumble-sdk` on npm](https://www.npmjs.com/package/pumble-sdk) ·
[`CAKE-com/pumble-node-sdk` on GitHub](https://github.com/CAKE-com/pumble-node-sdk).
The two SDKs target different Pumble products and do not overlap.

It is also **not** a general SDK generator (use Stainless or Speakeasy for that)
or a multi-language code generator — see the
[product boundary note](docs/product/sdk-generator-product-boundary.md).

## Documentation

Start at the **[documentation map](sdk/docs/INDEX.md)**, which groups every doc
by job. Common entry points:

- [Quickstart](sdk/docs/QUICKSTART.md) · [API reference](sdk/docs/API-REFERENCE.md) · [CLI reference](sdk/docs/CLI-REFERENCE.md)
- [Error model](sdk/docs/ERROR-MODEL.md) · [Resolvers](sdk/docs/RESOLVERS.md) · [Retries, timeouts & rate limits](sdk/docs/RETRIES-TIMEOUTS-RATE-LIMITS.md)
- [MCP safety](sdk/docs/MCP-SAFETY.md) · [Observability](sdk/docs/OBSERVABILITY.md) · [Stability](sdk/docs/STABILITY.md)
- [Testing](sdk/docs/TESTING.md) · [CI gates](sdk/docs/CI-GATES.md) · [Versioning](sdk/docs/VERSIONING.md) · [Migrating](sdk/docs/MIGRATING.md)
- [Examples](sdk/examples/INDEX.md) · [SDK package README](sdk/README.md)

## Contributing & security

- [Contributing guide](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Changelog](CHANGELOG.md)
- Changes are scoped through the [`.goals/` registry](.goals/README.md) and must
  keep `cd sdk && npm run verify:offline` green.

## License

[MIT](LICENSE) © apet97
