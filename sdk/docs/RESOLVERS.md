# Resolvers (channel + user)

The Pumble API does not offer a single-record lookup for channels or users by name/email — `listChannels` and `listUsers` are the only way. Resolvers paper over that.

## Paths

| Input | Strategy |
| --- | --- |
| 24-char ID | Direct, no list call. With `validateTarget: true`, the SDK confirms the ID exists. |
| `#name` | `listChannels` cached per client; ambiguity raises a structured error. |
| `email@x.com` | `listUsers` cached per client. |

## Cache options

```ts
createPumbleClient({ resolverCache: true });
createPumbleClient({ resolverCache: { enabled: true, ttlMs: 60_000 } });
```

- Disabled by default.
- In-memory, per-client.
- Failed loads do not poison the cache (the entry is deleted on throw).
- TTL applies per entry.

## Metrics

```ts
const cache = createResolverCache(source, { ttlMs: 30_000 });
const { hits, misses, evictions } = cache.metrics();
```

Use this to right-size TTL for large workspaces. Metrics are best-effort — they do not block under load.

## Validating an ID

```ts
await client.messages.send({ channel: channelId, text: "ok", validateTarget: true });
```

`validateTarget: true` forces a confirming read before the write — costs one list call (cached) for one safer write.
