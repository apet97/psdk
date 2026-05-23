# Changelog

This project follows semver tags such as `v0.3.21`.

Release notes are generated on GitHub releases. Keep notable hand-written SDK,
CLI, MCP, security, and docs changes summarized here when preparing a release.

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
