# Stability

## Stable

- Raw generated SDK import paths documented in `package.json`.
- Facade helpers from `pumble-sdk/extensions/index.js`.
- Webhook verification helpers.
- Curated MCP read tools and preview/confirmed message writes.

## Beta

- CLI commands.
- Telemetry and audit-log helpers.
- Testing and replay helpers.

## Experimental

- Socket Mode is experimental. A WebSocket transport is not bundled. Callers
  must inject `createSocket` after choosing and testing a transport.
- Package-split surfaces described in `docs/PACKAGE-SPLIT.md`.

## Internal

- Generated files under `src/funcs`, `src/models`, `src/sdk`, `src/lib`,
  `src/hooks`, and `src/mcp-server/tools` are implementation output.
