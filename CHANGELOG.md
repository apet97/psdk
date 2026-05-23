# Changelog

This project follows semver tags such as `v0.3.21`.

Release notes are generated on GitHub releases. Keep notable hand-written SDK,
CLI, MCP, security, and docs changes summarized here when preparing a release.

## 0.3.21

### Generated API

- Regenerated the TypeScript SDK from `PumbleOpenApi.yaml`.
- Kept scheduled-message raw endpoints available under `pumble.raw.scheduledMessages`.

### Facade

- Added facade failure values for resolver and operation failures.
- Added branded ID helpers for safer facade receipts.

### CLI/MCP

- Published `pumble` and `pumble-mcp` bins.
- Kept curated MCP as the default profile with preview/confirm write tools.

### Webhooks/App Helpers

- Kept webhook verification stable.
- Marked app/OAuth/socket helpers experimental.

### Security

- Kept debug redaction, non-idempotent write retry suppression, fixture redaction, and pack smoke gates.

### Docs

- Updated README, API reference, support, stability, package split, and quickstart docs.

### Migration Notes

- Package remains Node.js 20+ ESM.
- Experimental helpers should not be treated as production app-framework contracts.

## Generated API

- Generated SDK changes remain gated by `npm run verify:offline` before publish.

## Facade

- Facade-facing changes should call out request/receipt shape changes and
  failure-value behavior.

## CLI/MCP

- CLI and MCP changes should list affected binaries, profiles, transports, and
  safety defaults.

## Webhooks/App Helpers

- Webhook and app-helper changes should identify stable webhook verification
  separately from experimental app/OAuth utilities.

## Security

- Security notes should cover auth, token handling, redaction, and exposed
  transport defaults.

## Docs

- Docs notes should list public README, API reference, support, and stability
  updates that ship with the npm package.

## Migration Notes

- Migration notes should name changed import paths, runtime requirements, and
  compatibility steps for existing `pumble-sdk` callers.
