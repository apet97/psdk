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
- SSE transport binds to `127.0.0.1` only and requires a bearer token.
- Audit log redacts auth headers, message bodies, emails, and 24-char Pumble IDs.

## Snapshot test

`tests/mcp-tool-manifest.test.ts` snapshots the curated tool list; the snapshot file is committed and must change deliberately. The same test fails if any destructive tool name (`deleteMessage`, `archiveChannel`, etc.) appears in the curated set.
