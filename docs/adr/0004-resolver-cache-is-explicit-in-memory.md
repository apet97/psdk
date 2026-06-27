# Resolver cache is explicit in-memory

Status: Accepted

## Context

Facade target resolution can call `listChannels` and `listUsers` repeatedly.
Caching can improve repeated workflows, but hidden refresh behavior would make
results harder to reason about.

## Decision

Resolver cache is explicit in-memory per client instance. It is disabled by
default and has no background refresh, no persistence, and no resolverCache
`"auto"` mode. A bounded per-entry TTL is opt-in via
`resolverCache: { enabled: true, ttlMs }`; with `resolverCache: true` (no
`ttlMs`) entries never expire.

## Consequences

Callers opt in with `resolverCache: true`, refresh intentionally with
`resolvers.refresh()`, and clear intentionally with `resolvers.clearCache()`.
Rejected list promises are cleared so a later resolver call can retry.
