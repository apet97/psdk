# Integration Usage

This package combines generated Pumble API coverage with hand-written helpers
for application and MCP workflows.

See `docs/STABILITY.md` for stable, beta, experimental, and internal surfaces.

## Generated And Hand-Written Boundary

- `src/sdk/`, `src/models/`, and the raw MCP endpoint tools are generated from
  `../PumbleOpenApi.yaml`.
- Hand-written, stable integration helpers live under `src/extensions/`,
  `bin/`, `docs/`, `examples/`, `scripts/`, and `tests/`.
- Do not patch generated source by hand. Fix the OpenAPI document, generation
  config, or add a hand-written facade instead.

## Client Integration

- Use `createPumbleClient` from `pumble-keys-sdk/extensions/index.js` for common
  app code.
- Use `client.raw` or `PumbleSDK` when you need a generated method not yet
  wrapped by the facade.
- Resolve before act: call `resolveChannel`, `resolveUser`, or the facade
  `client.channels.find` / `client.users.find` before writes based on human
  input.
- Prefer facade writes such as `client.messages.send({ channel, text })`,
  `client.messages.dm({ user, text })`, and
  `client.threads.reply({ channel, messageId, text })`; they resolve names and
  emails before calling generated write endpoints.
- Use `client.scheduled` for scheduled messages when you want resolver-backed
  create/list/edit/cancel flows and printable receipts.
- Resolver caching is opt-in with `createPumbleClient({ resolverCache: true })`.
  Use `client.resolvers.refresh()` to preload channel and user lists, and
  `client.resolvers.clearCache()` when you need a fresh lookup.
- Treat ambiguous and not-found resolve results as stop conditions until a
  user or policy selects the exact target ID.
- Use `client.raw.scheduledMessages` only when you need the raw scheduled-message
  endpoint escape hatch.

## Resolver Performance

Facade resolution uses `listChannels` and `listUsers` because Pumble does not
provide server-side lookup by channel name or user email for these flows.

Use exact IDs when you already have them; exact IDs avoid ambiguity. Enable
`resolverCache: true` and call `client.resolvers.refresh()` for repeated facade
writes in large workspaces.

`resolverCache` defaults to `false` for compatibility. Use `resolverCache: true` for one in-memory channel/user list per client, or `resolverCache: { enabled: true, ttlMs: 60_000 }` when large workspaces need bounded refresh. Exact IDs remain the fastest hot path because they avoid resolver scans and ambiguity checks. Use manual `refresh()` and `clearCache()` to preload or discard those resolver lists.

## Rate Limit Coordination

The built-in rate limiter is process-local. It does not coordinate across workers, serverless instances, containers, or machines.

For distributed deployments, place rate-limit coordination outside the SDK. Use a shared store such as Redis in application code, then call the SDK only after the shared limiter grants a slot. Do not add Redis as a core dependency of `pumble-keys-sdk`.

## MCP Integration

- `pumble-keys-mcp start` defaults to the curated profile.
- `--profile readonly` hides mutating generated tools entirely.
- `--profile curated` makes the default curated behavior explicit in host
  configuration.
- `--profile readwrite` exposes the raw generated tool surface and should be
  used only when that broad surface is intentional. It requires
  `--allow-raw-writes --audit-log <path>`.
- Curated normal results use `{ ok, summary, ids, data, nextActions }`.
- `npm run test:mcp:live` is the curated MCP live smoke; it checks the curated
  tool list and preview/confirmed write envelopes against a sacrificial
  workspace.

## Curated Write Safety

- Curated message writes require preview and confirmation.
- For channel messages, call `send_message_preview`, show the returned
  `{ request, preview, confirmationToken }`, then call
  `send_message_confirmed` only with the unchanged payload after approval.
- For thread replies, use `reply_to_thread_preview` followed by
  `reply_to_thread_confirmed` in the same way.
- The confirmation token is process-local integrity data. It is not a Pumble
  credential or server-side approval record.
- Do not put API keys, access tokens, webhook signing secrets, or private
  workspace data into prompts, logs, examples, or replay fixtures.
- Prefer env, file, or stdin secret input for CLI workflows; command-line API
  keys can leak through shell history, process listings, CI logs, and terminal
  recordings.
- Facade examples are import-safe and covered by `npm run test:examples`; live
  network calls happen only when an example is executed directly.

## Experimental App Boundary

OAuth/app helpers and Socket Mode are experimental. They do not provide a complete install, token refresh, durable token storage, workspace-selection flow, bundled WebSocket transport, deployment recipe, or live app test suite.

For organization deployments:

- Store API keys in server-side secret managers.
- Prefer env/file/stdin secret input for CLI.
- Use curated MCP by default.
- Require `--allow-raw-writes --audit-log <path>` for raw MCP writes.
- Keep audit logs in restricted storage.
- Verify live smoke output is redacted before sharing.
