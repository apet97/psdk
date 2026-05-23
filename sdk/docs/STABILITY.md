# Stability

## Supported Surfaces

| Import path | Surface | Stability |
| --- | --- | --- |
| `pumble-sdk` | Raw SDK | Stable |
| `pumble-sdk/extensions/index.js` | Facade helpers | Stable |
| `pumble-sdk/extensions/webhooks.js` | Webhook verification | Stable |
| `pumble-sdk/extensions/telemetry.js` | Telemetry helpers | Beta |
| `pumble-sdk/extensions/testing/index.js` | Testing/replay helpers | Beta |
| `pumble-sdk/extensions/app/index.js` | App/OAuth helpers | Experimental |
| `pumble-sdk/extensions/app/socket-mode.js` | Socket Mode | Experimental |

## Stable

- Raw generated SDK imports from `pumble-sdk`.
- API-key SDK auth.
- Facade helpers from `pumble-sdk/extensions/index.js`.
- Webhook verification helpers.
- Curated MCP stdio/read tools and confirmed writes.

## Beta

- CLI commands.
- Telemetry helpers.
- Audit-log helpers.
- Testing and replay helpers.

## Experimental

- OAuth/app helpers are experimental utilities; they do not provide a complete install, token refresh, storage, and workspace-selection flow.
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
