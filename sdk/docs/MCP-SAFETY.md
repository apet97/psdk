# MCP safety profiles

The Pumble MCP server runs in one of four profiles. The curated profile is the default.

| Profile | Tools surface | Writes | Recommended for |
| --- | --- | --- | --- |
| `curated` (default) | Hand-picked tools, compact return shapes | Preview / confirm | Agents, shared assistants |
| `readonly` | All generated read endpoints | None | Read-only automation |
| `readwrite` | All generated read + write endpoints | Direct | Power users on trusted hosts |
| `readwrite --dry-run` | Same as `readwrite` | Intercepted via fetch shim | Local rehearsal |

## Defaults that must not change without an ADR

- Curated is the only mode reachable from the published binary without flags.
- `readwrite` requires `--allow-raw-writes` **and** `--audit-log <path>`.
- SSE transport defaults to `127.0.0.1` and warns when bound to `0.0.0.0`; a bearer token is optional and enforced only when `--auth-token` is set.
- Audit log redacts auth headers, message bodies, emails, and 24-char Pumble IDs.

## Knowledge resources

The curated MCP exposes two static knowledge resource templates that do
not require an API client — they read directly from files shipped in
the npm tarball under `knowledge/`:

- `pumble://knowledge/{+path}` — any file under `sdk/knowledge/`. The
  resource handler resolves the requested path against the knowledge
  root and **rejects path-traversal attempts** (`../`, absolute paths)
  before any read; unknown paths return an error instead of an empty
  body. Mime type is inferred from the extension (`.md` -> `text/markdown`,
  `.ts`/`.mts`/`.tsx` -> `text/x-typescript`).
- `pumble://events/{name}` — convenience wrapper for one of Pumble's
  typed Notification* event payloads (`Message`, `Reaction`, `Channel`,
  `AppUninstalled`, `AppUnauthorized`, `WorkspaceUserJoined`). Returns
  a markdown wrapper that inlines the lifted typed payload from
  `sdk/knowledge/upstream/events/index.ts` so an agent can read the
  shape without two round-trips.

Both templates expose a `list` callback so an MCP client can enumerate
every knowledge file currently in the tarball without prior knowledge of
the layout.

## Knowledge prompts

Two prompts read from the knowledge resources above so an agent does
not need to be told Pumble's conventions up front:

- `write_pumble_handler` — generates a `typescript` (or `javascript`)
  handler skeleton for a given event. It instructs the agent to read
  `pumble://events/{event}` for the typed payload, import facade
  helpers from `pumble-keys-sdk/extensions/index.js`, use branded ID
  helpers for validation, and return a `FacadeResult`-shaped value.
  It explicitly avoids OAuth-app concepts like `ack()` and view
  submissions, which are out of scope for the API-Keys add-on.
- `debug_pumble_webhook` — accepts a raw payload JSON and walks the
  agent through type discrimination using the upstream README and the
  per-event resources. The handler rejects payloads that are not
  parseable JSON before producing the walkthrough.

Both prompts use zod `argsSchema` so empty or malformed arguments are
rejected before the handler runs.

## Snapshot test

`tests/mcp-tool-manifest.test.ts` snapshots the curated tool list; the snapshot file is committed and must change deliberately. The same test fails if any destructive tool name (`deleteMessage`, `archiveChannel`, etc.) appears in the curated set.
