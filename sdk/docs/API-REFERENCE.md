# API Reference

## Raw SDK

Use the generated SDK when you need direct endpoint coverage.

```ts
import { PumbleSDK } from "pumble-sdk";

const sdk = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});
```

Raw resource groups:

- `channels`
- `messages`
- `scheduledMessages`
- `users`

Raw SDK methods throw SDK errors.

## Facade

Use the facade for application flows that benefit from target resolution,
receipts, and value failures.

```ts
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const pumble = createPumbleClient({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});
```

Facade methods:

- `messages.send`
- `messages.dm`
- `threads.reply`
- `search.recent`
- `resolvers.preflight`
- `resolvers.clearCache`
- `resolvers.refresh`
- `resolvers.cacheInfo`

Facade result shape:

```ts
type FacadeResult<T> =
  | ({ ok: true; summary: string } & T)
  | { ok: false; reason: string; summary: string; choices: unknown[]; nextActions: string[] };
```

The facade operations return value failures after the operation failure handling in
this branch is implemented. Raw SDK methods still throw.

## Errors

Raw SDK methods throw SDK errors such as response validation, status, and
transport errors. The facade returns value failures for resolver failures and,
after the operation failure handling in this branch, API and transport failures.

Use `assertFacadeOk` when a caller wants thrown failures from facade results.
Use `categorizeError` to map thrown raw SDK errors into application categories.

## Pagination

Raw generated pagination is lower level and follows endpoint-specific response
shapes. For search walks, prefer `searchAllMessages`.

`searchAllMessages` is the safer helper for search walks because it manages
timestamp cursors, overlaps same-second boundaries, and dedupes by message ID.
Very high-volume identical timestamp bursts may still require narrower query
windows.

## MCP

The default agent profile is curated:

```bash
pumble-mcp start --profile curated
```

Stdio is the local default transport for MCP clients. SSE binds to `127.0.0.1`
by default and supports optional bearer auth:

```bash
pumble-mcp start --transport sse --host 127.0.0.1 --auth-token "$PUMBLE_MCP_TOKEN"
```

Curated MCP read tools and confirmed-write tools are the stable agent-facing
surface.

## CLI

The package provides these binaries:

- `pumble`
- `pumble-mcp`

Use `pumble --help` for SDK shell commands and `pumble-mcp start --help` for MCP
transport/profile flags.

## Webhooks

Webhook helpers provide signature verification for signed Pumble callbacks and
an event handler/router surface for dispatching typed events. Keep raw-body
middleware in front of webhook verification routes.

## Stability

| Import path | Surface | Stability |
| --- | --- | --- |
| `pumble-sdk` | Raw SDK | Stable |
| `pumble-sdk/extensions/index.js` | Facade helpers | Stable |
| Webhook verification helpers | Webhook verification | Stable |
| Curated MCP stdio/read/confirmed-write tools | Agent tools | Stable |
| CLI | `pumble` and `pumble-mcp` commands | Beta |
| Telemetry | Telemetry helpers | Beta |
| Audit-log | Audit-log helpers | Beta |
| Testing/replay helpers | Test utilities | Beta |
| OAuth helpers | App auth utilities | Experimental |
| App framework | App helper utilities | Experimental |
| Socket Mode | Realtime app utilities | Experimental |
| Package split | Future packaging shape | Experimental |
| Generated internals and patch scripts | Generated/runtime maintenance | Internal |
