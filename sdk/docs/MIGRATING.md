# Migrating pumble-sdk

## 0.3.x To Explicit Export Map

- Replace unsupported wildcard imports with documented public imports.
- Use `pumble-sdk/extensions/index.js` for facade helpers.
- Use `pumble-sdk/extensions/webhooks.js` for webhook verification.
- Use raw SDK imports from `pumble-sdk`, `pumble-sdk/models`, `pumble-sdk/models/operations`, and `pumble-sdk/models/errors`.

## Scheduled Messages

- Prefer `client.scheduled` for facade workflows.
- Use `client.raw.scheduledMessages` only for raw endpoint escape hatches.

## MCP Raw Writes

- Curated MCP remains default.
- Raw readwrite mode now requires `--allow-raw-writes --audit-log <path>`.
