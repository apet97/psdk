# Integration Usage

This package combines generated Pumble API coverage with hand-written helpers
for application and MCP workflows.

## Generated And Hand-Written Boundary

- `src/sdk/`, `src/models/`, and the raw MCP endpoint tools are generated from
  `../PumbleOpenApi.yaml`.
- Hand-written, stable integration helpers live under `src/extensions/`,
  `bin/`, `docs/`, `examples/`, `scripts/`, and `tests/`.
- Do not patch generated source by hand. Fix the OpenAPI document, generation
  config, or add a hand-written facade instead.

## Client Integration

- Use `createPumbleClient` from `pumble-sdk/extensions/index.js` for common
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
- Treat ambiguous and not-found resolve results as stop conditions until a
  user or policy selects the exact target ID.

## MCP Integration

- `pumble-mcp start` defaults to the curated profile.
- `--profile readonly` hides mutating generated tools entirely.
- `--profile curated` makes the default curated behavior explicit in host
  configuration.
- `--profile readwrite` exposes the raw generated tool surface and should be
  used only when that broad surface is intentional.
- Curated normal results use `{ ok, summary, ids, data, nextActions }`.

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
