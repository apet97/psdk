# Documentation index

## Start here

- [Quickstart](QUICKSTART.md)

## SDK basics

- [API reference](API-REFERENCE.md)
- [Errors](ERRORS.md) / [Error model](ERROR-MODEL.md)
- [Stability](STABILITY.md)
- [Resolvers](RESOLVERS.md)

## Facade workflows

Embedded inside [API reference](API-REFERENCE.md) — every façade method is documented there.

## Raw SDK reference

- See the `sdks/` directory (generated).

## CLI

- [CLI reference](CLI-REFERENCE.md)

## MCP

- [MCP safety profiles](MCP-SAFETY.md)
- [Integration usage](INTEGRATION-USAGE.md)

## Webhooks

- See [API reference](API-REFERENCE.md#webhooks) and `examples/webhooks/`.

## Testing & replay

- [Testing taxonomy](TESTING.md)

## Errors

- [Error model](ERROR-MODEL.md)

## Releases & support

- [Support](SUPPORT.md)
- [Migrating](MIGRATING.md)
- [Verification archive](verification/v0.3.21.md)
- [CI gates](CI-GATES.md)
- [Versioning](VERSIONING.md)

## Experimental

- App helpers / OAuth / Socket Mode — see `extensions/app/` and the experimental flag at the top of each file; see [Stability](STABILITY.md).

## Internal governance

- [Patch burndown](patch-burndown.md)
- [Package split policy](PACKAGE-SPLIT.md)
- [Spec contract](SPEC-CONTRACT.md)
- [Goal registry](../../.goals/README.md) — one YAML per goal; validated by `scripts/goal-check.mjs`.
- ADRs:
  - [`docs/adr/0001-0007`](../../docs/adr/) — generated SDK regen, facade failures, curated MCP writes, resolver cache, redacted live smoke, non-idempotent write retries, debug redaction.
  - [`sdk/docs/adr/0008`](adr/0008-generated-runtime-patches.md) — generated-runtime patches.
