# SDKP Context

SDKP is the local working repo for the Pumble TypeScript SDK. The SDK package
lives under `sdk/` and combines generated API client code with a smaller set of
handwritten extensions, curated MCP tools, scripts, fixtures, knowledge files,
and docs.

## Vocabulary

**Generated SDK**: Speakeasy-generated endpoint, model, client, function, hook,
library, and raw MCP-tool code. These files are regenerated from source specs
and are not hand-edited.

**Handwritten extensions**: stable user-facing helpers under
`sdk/src/extensions`. These helpers wrap generated endpoints with safer,
ergonomic behavior while preserving raw generated access.

**Facade**: the ergonomic `createPumbleClient()` API around generated endpoints.
It resolves human targets, performs writes through generated methods, and
returns structured receipts or facade failure values.

**Resolver**: client-side channel and user target resolution. Resolvers accept
IDs and human inputs such as channel names, `#channel` names, emails, and names.

**Resolver cache**: optional per-client in-memory `listChannels` and `listUsers`
cache. It is off by default; a bounded per-entry TTL is opt-in via
`resolverCache: { enabled: true, ttlMs }`. It has no background refresh, no
persistence, and no hidden invalidation beyond clearing failed list promises so
callers can retry.

**Curated MCP**: the agent-facing MCP profile. It exposes compact read tools and
preview/confirm write tools rather than the full generated tool surface.

**Live smoke**: live API verification scripts under `sdk/scripts`. They prove
facade and curated MCP behavior against real endpoints and must redact secrets,
emails, and live IDs in final output.

**Replay fixtures**: sanitized recordings used for deterministic offline tests.
They let the SDK replay live-like behavior without leaking workspace data.

**Generated runtime patch**: narrow post-generation script for generator output
that cannot be expressed through the OpenAPI spec or Speakeasy config.

**Goal**: one YAML under `.goals/`, scoped by `scope.allowed` and
`scope.forbidden`, with explicit `acceptance` criteria,
`adversarial_checks`, `commands`, and a `rollback` line. A goal is the
atomic unit of change in this repo. Validated by
`sdk/scripts/goal-check.mjs` and pinned by `sdk/tests/goal-registry.test.ts`
plus `sdk/tests/goal-check.test.ts`.

**Knowledge tree**: `sdk/knowledge/` ships agent-readable static
content in two halves. `native/` is curated by us. `upstream/` is a
tightly-scoped, ISC-attributed lift from `CAKE-com/pumble-node-sdk`
(events + V1 block types only - no framework, no OAuth, no modals
runtime). Refresh via `sdk/scripts/refresh-knowledge.mjs`. Attribution
headers are mandatory on every upstream file and enforced by
`sdk/scripts/attribution-audit.mjs`.

## Non-Negotiables

- Generated directories are regenerated, not hand-edited.
- Generated runtime patches must live in `sdk/scripts/patch-generated-runtime.mjs`.
- Facade failures are values, not thrown exceptions, unless callers use
  `assertFacadeOk`.
- Fresh writes should be proven with direct read endpoints, not search indexing.
- MCP writes must remain preview/confirm where that contract already exists.
- Final live-smoke output must remain redacted.
- Resolver cache behavior stays explicit: off by default, optional bounded
  per-entry `ttlMs`, no background refresh, no persistence, and no resolverCache
  `"auto"` mode.
- Live scripts and docs must not contain API keys, live emails, or raw live IDs.
- Every upstream-derived file under `sdk/knowledge/upstream/` carries
  the three required attribution markers (`@derived-from
  CAKE-com/pumble-node-sdk`, `@upstream-path`, `@license ISC`) and is
  listed in `sdk/THIRD_PARTY_NOTICES.md`.
- A version bump touches `sdk/package.json#version`, a `## <version>`
  heading in `CHANGELOG.md`, and `sdk/docs/verification/v<version>.md`
  together - `sdk/scripts/version-consistency.mjs` fails the offline
  pipeline otherwise.

## Generated Directories

Do not edit these by hand. The full list lives in
[`.goals/manifest.yaml#guardrails.generated_paths`](.goals/manifest.yaml)
and is the authoritative source; this list is a mirror.

- `sdk/src/sdk`
- `sdk/src/models`
- `sdk/src/funcs`
- `sdk/src/lib`
- `sdk/src/hooks`
- `sdk/src/types`
- `sdk/src/core.ts`
- `sdk/src/index.ts`
- `sdk/src/mcp-server/tools`

To change generated behavior, edit `PumbleOpenApi.yaml`,
`sdk/.speakeasy/gen.yaml`, or
`sdk/scripts/patch-generated-runtime.mjs` (sanctioned post-gen
patches; the patch registry is the index of every such patch and its
removal condition). Never hand-edit a generated file - regenerate
instead.

## Architecture Decisions

- [Generated SDK is regenerated](docs/adr/0001-generated-sdk-is-regenerated.md)
- [Facade failures are values](docs/adr/0002-facade-failures-are-values.md)
- [Curated MCP writes use preview and confirm](docs/adr/0003-curated-mcp-writes-use-preview-confirm.md)
- [Resolver cache is explicit in-memory](docs/adr/0004-resolver-cache-is-explicit-in-memory.md)
- [Live smoke output is redacted](docs/adr/0005-live-smoke-output-is-redacted.md)
- [Non-idempotent writes do not retry](docs/adr/0006-non-idempotent-writes-do-not-retry.md)
- [SDK debug output is redacted](docs/adr/0007-sdk-debug-output-is-redacted.md)

## Offline Gate

Every commit must keep `cd sdk && npm run verify:offline` green. The
pipeline (in order):

1. `goals:check` - every goal yaml is well-formed; every `status:done`
   goal links a real test file.
2. `attribution-audit` - every `sdk/knowledge/upstream/` file carries
   the three required markers and is listed in `THIRD_PARTY_NOTICES.md`.
3. `version-consistency` - `package.json` version agrees with
   `CHANGELOG.md` and `docs/verification/v<version>.md`.
4. `spec:audit` - OpenAPI spec quality + retry contract checks.
5. `build` - MCP server bundle + tsgo emit.
6. `lint`, `test`, `test:arazzo:replay`, `test:live:replay`,
   `test:fixtures:scan`, `test:pack -- --skip-build`, `bench:smoke`.

Skipping with `--no-verify` is forbidden. If a hook fails, investigate
the root cause and fix it.

## Development Notes

Prefer small handwritten seams over broad rewrites. If a behavior belongs to
both curated read and write tools, put the MCP-facing contract in one narrow
curated module. If a facade helper grows large, extract cohesive internals while
keeping `sdk/src/extensions/index.ts` exports stable.

`AGENTS.md` at the repo root is the canonical agent-facing protocol
doc; read it before doing substantive work.
