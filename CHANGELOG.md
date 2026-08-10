# Changelog

This project follows semver tags such as `v0.4.0`.

Release notes are generated on GitHub releases. Keep notable hand-written SDK,
CLI, MCP, security, and docs changes summarized here when preparing a release.

## 0.4.0

First published release. `pumble-keys-sdk@0.4.0` is the first version
of this package on npm; no earlier version was published under this
name or under `pumble-sdk`. The sections below cover the development
work accumulated before this first publish.

### CI & tooling

- Fixed public CI: the Speakeasy CLI installer now authenticates its GitHub API
  "latest release" lookup with `GITHUB_TOKEN`, avoiding the unauthenticated
  shared-runner rate-limit (HTTP 403) that was breaking every run.
- Replaced the now lint-invalid `x-speakeasy-retries: { strategy: none }`
  no-retry marker on non-idempotent writes with `x-sdk-no-write-retries: true`
  (newer Speakeasy lint rejects `strategy: none`). Runtime behavior is
  unchanged — the generated runtime patch still clears those operations' retry
  codes (ADR-0006); the spec audit, its tests, and docs moved to the new marker.

### Public release & hardening

- Added a non-affiliation disclaimer to the repo and package READMEs: this is
  an independent, personal open-source project, not affiliated with, endorsed
  by, or sponsored by CAKE.com Inc. or Pumble.
- Set the package `author` and the MIT `LICENSE` copyright holder to the
  maintainer's personal identity (previously "Pumble SDK Team"); added a
  repo-root `LICENSE` so the license is detected at the repository level.
- `SECURITY.md` now points reporters at a concrete channel (GitHub private
  vulnerability reporting) instead of an undefined "documented security channel".
- Removed stale internal notes (`docs/site-plan.md` and a one-off review log)
  and deleted the pre-rename Docker files (`Dockerfile`, `docker-compose.yml`); their entrypoint pointed at a bin removed in the rename.
- Hardened the curated MCP knowledge resource guard to resolve symlinks
  (path-traversal defense) and extended the fixture secret scan to `.json`
  fixtures, not just `.jsonl`.

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

### Knowledge

- Shipped `sdk/knowledge/native/` (`README.md`, `glossary.md`,
  `api-shape.md`, `error-model.md`) — a curated agent-readable summary
  of the SDK's vocabulary, transport shape, and error model. Each file
  is held under 8 KB and is included in the npm tarball under
  `knowledge/native/`. G31 will expose them through the curated MCP
  via the `pumble://knowledge/{+path}` resource template.
- Lifted a tightly-scoped subset of `CAKE-com/pumble-node-sdk` (ISC)
  into `sdk/knowledge/upstream/`: the typed `NotificationXxx` event
  payloads (`events/index.ts`), the V1 block/view/element type
  declarations (`blocks/types.ts`), and a `events/README.md` that
  documents the boundary and Pumble's short-form field naming
  (`aId`, `cId`, `mId`, `tx`, ...). `sdk/scripts/refresh-knowledge.mjs`
  re-runs the lift from a local `officialsdk/pumble-node-sdk/` clone
  (exit 0 with a hint when the clone is missing so verify:offline
  stays green without forcing a clone). The runtime filter on
  `blocks/types.ts` keeps only type-level declarations so the file is
  side-effect-free when read as TypeScript.

### MCP

- Curated MCP server registers two new knowledge-backed resource
  templates: `pumble://knowledge/{+path}` exposes any file under
  `sdk/knowledge/` with extension-aware mime types and a
  path-traversal guard, and `pumble://events/{name}` is a convenience
  wrapper that returns a markdown payload inlining the lifted
  `Notification*` event type. Both templates expose a `list` callback
  so MCP clients can enumerate the knowledge tree at runtime.
  `CURATED_RESOURCE_NAMES` exports both new names.
- Curated MCP server registers two new prompts:
  `write_pumble_handler` (args: `event`, optional `language` defaulting
  to `typescript`) emits a handler skeleton that reads
  `pumble://events/{event}` and imports from
  `pumble-keys-sdk/extensions/index.js`; and `debug_pumble_webhook`
  (args: `payloadJson`) walks an agent through type discrimination
  using the upstream README and the per-event resources, rejecting
  unparseable JSON before producing guidance. `CURATED_PROMPT_NAMES`
  exports both new names.

### Versioning

- Added `sdk/scripts/version-consistency.mjs` which enforces that
  `sdk/package.json#version` matches a `## <version>` heading in the
  repo CHANGELOG and a `docs/verification/v<version>.md` evidence file.
  The script tolerates an `Unreleased` section and pre-release suffixes
  such as `0.4.0-rc.1`. `verify:offline` now runs the check between
  `attribution-audit` and `spec:audit` so a version bump that misses
  one of the three sources fails the offline pipeline.

### Governance

- Added `.goals/` registry: one YAML per goal (G00–G25), validated by `sdk/scripts/goal-check.mjs` and spliced into `verify:offline`.

### Docs

- New documentation index ([`sdk/docs/INDEX.md`](sdk/docs/INDEX.md)) groups every doc by job.
- New docs: `CI-GATES.md`, `MCP-SAFETY.md`, `ERRORS.md` (long-form error model), `RESOLVERS.md`, `CLI-REFERENCE.md`, `TESTING.md`, `EXPERIMENTAL.md`, `SECURITY-CHECKLIST.md`, `OBSERVABILITY.md`, `VERSIONING.md`, `OPERATIONS-CHECKLIST.md`, `REALTIME.md`, `RETRIES-TIMEOUTS-RATE-LIMITS.md`, `SPEC-CONTRACT.md`, `patch-burndown.md`, `PATCH-COUNT.txt`.
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

- **Behavior change:** an explicit `--api-key-auth` / `--api-key` flag now
  beats `PUMBLE_API_KEY` / `PUMBLESDK_API_KEY_AUTH` env vars. Before, the
  env vars silently overrode the flag. `--api-key-file` and
  `--api-key-stdin` still rank highest. The MCP wrapper already resolved
  flag over env; both surfaces now agree.
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

Development history. This version was never published to npm.

### Generated API

- Regenerated the TypeScript SDK from `PumbleOpenApi.yaml`.
- Kept scheduled-message raw endpoints available under `pumble.raw.scheduledMessages`.

### Facade

- Added facade failure values for resolver and operation failures.
- Added branded ID helpers for safer facade receipts.

### CLI/MCP

- Added `pumble` and `pumble-mcp` bins.
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
