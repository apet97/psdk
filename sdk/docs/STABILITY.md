# Stability

## Supported Surfaces

The table below mirrors every entry in `package.json#exports`. The audit script
`scripts/public-surface-audit.mjs` fails CI when a new export lands without a
tier row here.

| Export key | Import path | Surface | Tier |
| --- | --- | --- | --- |
| `.` | `pumble-sdk` | Raw SDK + façade re-exports | stable |
| `./core.js` | `pumble-sdk/core.js` | Generated core | stable |
| `./types` | `pumble-sdk/types` | Public types | stable |
| `./models` | `pumble-sdk/models` | Generated models | stable |
| `./models/errors` | `pumble-sdk/models/errors` | Error classes | stable |
| `./models/operations` | `pumble-sdk/models/operations` | Operation models | stable |
| `./extensions/index.js` | `pumble-sdk/extensions/index.js` | Façade helpers | stable |
| `./extensions/webhooks.js` | `pumble-sdk/extensions/webhooks.js` | Webhook verification | stable |
| `./extensions/telemetry.js` | `pumble-sdk/extensions/telemetry.js` | Telemetry helpers | beta |
| `./extensions/testing/index.js` | `pumble-sdk/extensions/testing/index.js` | Testing/replay helpers | beta |
| `./extensions/app/index.js` | `pumble-sdk/extensions/app/index.js` | App/OAuth helpers | experimental |
| `./extensions/app/socket-mode.js` | `pumble-sdk/extensions/app/socket-mode.js` | Socket Mode | experimental |
| `./lib/http` | `pumble-sdk/lib/http` | Generated HTTP shim | internal |

## Stable

- Raw generated SDK imports from `pumble-sdk`.
- API-key SDK auth.
- Facade helpers from `pumble-sdk/extensions/index.js`, including resolver-first
  users, channels, messages, threads, search, and scheduled-message workflows.
- Webhook verification helpers.
- Curated MCP stdio/read tools and confirmed writes.

## Beta

- CLI commands.
- Telemetry helpers.
- Audit-log helpers.
- Testing and replay helpers.

## Experimental

- OAuth/app helpers are experimental utilities; they do not provide a complete install, token refresh, storage, and workspace-selection flow.
- OAuth/app helpers and Socket Mode are experimental. They do not provide a complete install, token refresh, durable token storage, workspace-selection flow, bundled WebSocket transport, deployment recipe, or live app test suite.
- App framework helpers.
- Socket Mode is experimental. A WebSocket transport is not bundled. Callers
  must inject `createSocket` after choosing and testing a transport.
- Package split planning in `docs/PACKAGE-SPLIT.md`.

## Internal

- Generated internals under `src/funcs`, `src/models`, `src/sdk`, `src/lib`,
  `src/hooks`, and `src/mcp-server/tools`.
- Patch scripts under `scripts/`.

## Extension Barrel Categories

- Facade helpers
- Pagination helpers
- Thread/context helpers
- Write confirmation helpers
- Resolver helpers
- Retry/error/rate-limit helpers
- Branded ID helpers
- Telemetry helpers
- Testing/replay helpers
- App/OAuth helpers
- Webhook verification

## Feedback Coverage

- package docs
- API reference
- facade failures
- error categorization
- exact-ID fast paths
- branded facade IDs
- MCP SSE host/auth
- search pagination overlap
- publish gate
- public surface labels
- runtime patch guard
- retry backoff
- examples packaging decision
- OAuth/app status
- package split decision
- resolver cache performance docs
- CLI docs
- architecture diagram

## Migration paths

Future packages (placeholders, blocked until G07 gates pass):

- `@pumble/sdk-core` — generated raw client.
- `@pumble/webhooks` — webhook helpers.
- `@pumble/mcp` — curated MCP.
- `@pumble/testing` — replay helpers.
- `@pumble/app-framework` — OAuth + Socket Mode (G08).
