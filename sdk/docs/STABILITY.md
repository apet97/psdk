# Stability

## Stable

- Raw generated SDK imports from `pumble-sdk`.
- Facade helpers from `pumble-sdk/extensions/index.js`.
- Webhook verification helpers.
- Curated MCP stdio/read tools and confirmed writes.

## Beta

- CLI commands.
- Telemetry helpers.
- Audit-log helpers.
- Testing and replay helpers.

## Experimental

- OAuth helpers.
- App framework helpers.
- Socket Mode is experimental. A WebSocket transport is not bundled. Callers
  must inject `createSocket` after choosing and testing a transport.
- Package split planning in `docs/PACKAGE-SPLIT.md`.

## Internal

- Generated internals under `src/funcs`, `src/models`, `src/sdk`, `src/lib`,
  `src/hooks`, and `src/mcp-server/tools`.
- Patch scripts under `scripts/`.
