# Documentation index

## Start here

- [Quickstart](QUICKSTART.md)

## SDK basics

- [API reference](API-REFERENCE.md)
- [Errors](ERRORS.md)
- [Stability](STABILITY.md)
- [Resolvers](RESOLVERS.md)

## Facade workflows

Embedded inside [API reference](API-REFERENCE.md) - every façade method is documented there.

## Raw SDK reference

- See the `sdks/` directory (generated).

## CLI

- [CLI reference](CLI-REFERENCE.md)

## MCP

- [MCP safety profiles](MCP-SAFETY.md)
- [Integration usage](INTEGRATION-USAGE.md)

## Knowledge

Static knowledge ships in the npm tarball under `knowledge/` and is exposed
through the curated MCP server. See [MCP-SAFETY.md#knowledge-resources](MCP-SAFETY.md#knowledge-resources) for the resource and prompt URIs.

- **Resource templates:**
  - `pumble://knowledge/{+path}` - any file under `sdk/knowledge/`
    (native curated docs + ISC-attributed upstream lift).
  - `pumble://events/{name}` - markdown wrapper for one of Pumble's
    `Notification*` event payloads (`Message`, `Reaction`, `Channel`,
    `AppUninstalled`, `AppUnauthorized`, `WorkspaceUserJoined`).
- **Prompts:**
  - `write_pumble_handler` - generate a typed handler skeleton for an event.
  - `debug_pumble_webhook` - walk through an unknown payload using the
    knowledge resources.

## Webhooks

- See [API reference](API-REFERENCE.md#webhooks) and `examples/webhooks/`.

## Observability

- [Telemetry, audit log, OpenTelemetry](OBSERVABILITY.md)
- [Retries, timeouts, rate limits](RETRIES-TIMEOUTS-RATE-LIMITS.md)

## Testing & replay

- [Testing taxonomy](TESTING.md)

## Errors

- [Errors](ERRORS.md)

## Releases & support

- [Support](SUPPORT.md)
- [Migrating](MIGRATING.md)
- [Verification archive](verification/v0.3.21.md)
- [CI gates](CI-GATES.md)
- [Versioning](VERSIONING.md)
- [Security checklist](SECURITY-CHECKLIST.md)
- [Operations checklist](OPERATIONS-CHECKLIST.md)
- [Realtime boundary](REALTIME.md)

## Experimental

- [Experimental surfaces](EXPERIMENTAL.md)
- App helpers / OAuth / Socket Mode - see `extensions/app/` and the experimental flag at the top of each file; see [Stability](STABILITY.md).

## Internal governance

- [Patch burndown](patch-burndown.md)
- [Package split policy](PACKAGE-SPLIT.md)
- [Spec contract](SPEC-CONTRACT.md)
- [Goal registry](../../.goals/README.md) - one YAML per goal; validated by `scripts/goal-check.mjs`.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) - upstream attribution for `sdk/knowledge/upstream/`.
- ADRs:
  - [`docs/adr/0001-0007`](../../docs/adr/) - generated SDK regen, facade failures, curated MCP writes, resolver cache, redacted live smoke, non-idempotent write retries, debug redaction.
  - [`sdk/docs/adr/0008`](adr/0008-generated-runtime-patches.md) - generated-runtime patches.
