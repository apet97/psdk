# Changelog

This project follows semver tags such as `v0.3.21`.

Release notes are generated on GitHub releases. Keep notable hand-written SDK,
CLI, MCP, security, and docs changes summarized here when preparing a release.

## Unreleased

### Identity

- Package renamed from `pumble-sdk` to `pumble-keys-sdk` to clear the npm
  namespace collision with CAKE.com's official `pumble-sdk` (workspace OAuth
  apps SDK). Our package targets the Pumble API-Keys add-on. CLI binaries
  renamed to `pumble-keys` and `pumble-keys-mcp`; bin files renamed in lock
  step.
- Added a *Product boundary* section to the repo README, sdk README, and
  API-Reference that names CAKE.com's upstream `pumble-sdk` and explains
  which Pumble product surface each SDK targets. A docs test pins the
  phrase so the boundary cannot silently disappear.

### Governance

- Added `THIRD_PARTY_NOTICES.md` and `sdk/scripts/attribution-audit.mjs`
  to scaffold the upcoming knowledge lift from `CAKE-com/pumble-node-sdk`
  (ISC). The audit fails the offline pipeline when an upstream-derived
  file is missing the attribution header or when the notices file falls
  out of sync with `sdk/knowledge/upstream/`. `verify:offline` now runs
  the audit immediately after `goals:check`.

### Governance

- Added `.goals/` registry: one YAML per goal (G00–G25), validated by `sdk/scripts/goal-check.mjs` and spliced into `verify:offline`.

### Docs

- New documentation index ([`sdk/docs/INDEX.md`](sdk/docs/INDEX.md)) groups every doc by job.
- New docs: `CI-GATES.md`, `MCP-SAFETY.md`, `ERROR-MODEL.md`, `RESOLVERS.md`, `CLI-REFERENCE.md`, `TESTING.md`, `EXPERIMENTAL.md`, `SECURITY-CHECKLIST.md`, `OBSERVABILITY.md`, `VERSIONING.md`, `OPERATIONS-CHECKLIST.md`, `REALTIME.md`, `RETRIES-TIMEOUTS-RATE-LIMITS.md`, `SPEC-CONTRACT.md`, `patch-burndown.md`, `PATCH-COUNT.txt`.
- README leads with `createPumbleClient` (façade-first).
- Quickstart adds a "Which API should I use?" decision table.
- Examples catalog (`sdk/examples/INDEX.md`) carries safety labels.
- API reference adds framework webhook recipes (express, fastify, next-route, node-http).

### SDK

- Façade exposes `client.search.all` (delegates to `searchAllMessages`) for safe full walks.
- `createResolverCache().metrics()` reports `{ hits, misses, evictions }`.
- Curated MCP exports `listCuratedTools()` with read/write metadata; snapshot-tested.
- Telemetry guarantees no message text in audit JSONL output (test pinned).

### CLI

- `pumble doctor` runs offline; redacts the API key.
- `pumble --version` prints the package version.
- Writes print a one-line success message by default; `--quiet` suppresses.

### Release engineering

- Release evidence script (`sdk/scripts/write-release-evidence.mjs`) emits Date, Commit, CI/Release URLs, npm URL, provenance, tarball SHA-256, and live-smoke artifact pointer for every `v*.md` doc.
- CI emits a job-summary table; release workflow runs `verify:live --required` and uploads redacted live smoke logs.
- Public surface audit (`scripts/public-surface-audit.mjs`) fails CI when a new export lands without a stability tier.
- npm pack budget (< 2.5 MB) and tarball exclusion test (`tests/`, `scripts/`, `examples/`, `.speakeasy/`).
- Cross-doc version check: `package.json#version` must match the latest CHANGELOG entry and `docs/verification/v*.md` filename.

### Spec

- Every write operation in `PumbleOpenApi.yaml` declares `x-speakeasy-retries` explicitly (`*noWriteRetries` for mutating writes, `*safeReadRetries` for read-shaped POSTs). Spec audit enforces this.

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
