# Pumble SDK glossary

Vocabulary an agent needs to understand the API-Keys SDK surface. Pumble
also has an OAuth-app SDK from CAKE.com that uses different concepts;
this glossary covers only what `pumble-keys-sdk` exposes.

## Identity and auth

- **API key** — workspace-scoped, static secret minted from *Workspace
  settings -> API keys*. Sent on every request as the `ApiKey` HTTP
  header. Treat like a password: rotate on suspected leak, never check
  into source control, never log even truncated.
- **Workspace** — the Pumble tenant the API key belongs to. The SDK
  never sees other workspaces; cross-workspace operations are out of
  scope for the API-Keys surface.

## Channels, users, messages

- **Channel id** — 24-character hex string. Stable across renames.
  Branded as `ChannelId` once it leaves the resolver.
- **Channel name** — the `#name` form a human types. Cheap to type,
  ambiguous to compute on (rename-prone). The resolver converts
  `#name` to a `ChannelId` once per cache window.
- **Channel type** — `PUBLIC` or `PRIVATE`. Affects who can see
  messages and join.
- **User id** — 24-character hex string for a workspace user. Branded
  as `UserId`. Distinct from workspace id; never combine the two in a
  single field.
- **Message id** — 24-character hex string identifying one message in
  one channel. A reply still has its own message id; the **thread
  root id** is the id of the first message in the thread.
- **Ephemeral message** — a one-shot message visible only to a single
  user. Created with the dedicated facade helper; never participates
  in thread replies.

## Library shape

- **Raw SDK** — the Speakeasy-generated `PumbleSDK` class. One method
  per OpenAPI operation, throws on HTTP error. Use it when you need
  exact endpoint control.
- **Facade** — the handwritten `createPumbleClient` layer over the
  raw SDK. Resolver-first, accepts `#name`/email inputs, returns
  value-style `FacadeResult` envelopes (`{ ok, summary, ids, data,
  nextActions }`) instead of throwing on operation failures. Default
  entry point.
- **Curated MCP** — the `pumble-keys-mcp` server's default profile.
  Workflow-first tools (preview + confirm for writes), no raw
  endpoints. Drop in for agents you do not control end-to-end.
- **Branded ID** — TypeScript nominal type (`ChannelId`, `UserId`,
  `MessageId`, `ScheduledMessageId`, `WorkspaceId`). Passes through
  the resolver and prevents a `UserId` from being silently used where
  a `ChannelId` was expected.

## Performance and reliability

- **Resolver** — converts `#name`/email inputs into branded ids by
  calling `listChannels`/`listUsers` once and caching the result.
- **Resolver cache** — an opt-in process-local map (`resolverCache:
  { enabled: true, ttlMs: 60_000 }`). Off by default to keep the
  default behavior easy to reason about. `client.resolvers.refresh()`
  re-warms it.
- **Live smoke** — a redacted end-to-end run against a real Pumble
  workspace. Output is captured under `sdk/docs/verification/` and
  shows that a release actually exchanged a real send/receive.
- **Replay fixture** — a JSONL recording of HTTP traffic captured by
  the `recorder.mjs` script and replayed by `replayer.mjs` so offline
  tests cover the same shapes a live run would.
