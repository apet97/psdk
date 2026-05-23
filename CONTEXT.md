# SDKP Context

SDKP is the local working repo for the Pumble TypeScript SDK. The SDK package
lives under `sdk/` and combines generated API client code with a smaller set of
handwritten extensions, curated MCP tools, scripts, fixtures, and docs.

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
cache. It has no TTL, no background refresh, no persistence, and no hidden
invalidation beyond clearing failed list promises so callers can retry.

**Curated MCP**: the agent-facing MCP profile. It exposes compact read tools and
preview/confirm write tools rather than the full generated tool surface.

**Live smoke**: live API verification scripts under `sdk/scripts`. They prove
facade and curated MCP behavior against real endpoints and must redact secrets,
emails, and live IDs in final output.

**Replay fixtures**: sanitized recordings used for deterministic offline tests.
They let the SDK replay live-like behavior without leaking workspace data.

## Non-Negotiables

- Generated directories are regenerated, not hand-edited.
- Facade failures are values, not thrown exceptions, unless callers use
  `assertFacadeOk`.
- Fresh writes should be proven with direct read endpoints, not search indexing.
- MCP writes must remain preview/confirm where that contract already exists.
- Final live-smoke output must remain redacted.
- Resolver cache behavior stays explicit: no TTL, no background refresh, no
  persistence, and no resolverCache `"auto"` mode.
- Live scripts and docs must not contain API keys, live emails, or raw live IDs.

## Generated Directories

Do not edit these by hand:

- `sdk/src/sdk`
- `sdk/src/models`
- `sdk/src/funcs`
- `sdk/src/lib`
- `sdk/src/hooks`
- `sdk/src/mcp-server/tools`

## Development Notes

Prefer small handwritten seams over broad rewrites. If a behavior belongs to
both curated read and write tools, put the MCP-facing contract in one narrow
curated module. If a facade helper grows large, extract cohesive internals while
keeping `sdk/src/extensions/index.ts` exports stable.
