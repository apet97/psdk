# CLI reference

Run `pumble-keys --help` for a top-level overview. Every command supports `--json` unless noted.

## Global flags

- `--api-key-auth <key>` (also accepted as `--api-key`; legacy direct)
- `--api-key-file <path>`
- `--api-key-stdin`
- `--base-url <url>`
- `--timeout-ms <ms>`
- `-q` / `--quiet` - suppress the default one-line success message for writes
- `--version` - print the package version
- `-h` / `--help`

Prefer `PUMBLE_API_KEY`, `--api-key-file`, or `--api-key-stdin` over
command-line keys. Command-line secrets can leak through shell history,
process listings, CI logs, and terminal recordings.

## Exit codes

- `0` - success.
- `1` - runtime error (API failure, network failure).
- `2` - usage error (unknown command or flag value). The CLI prints a
  pointer to `--help`.

## Environment variables

- `PUMBLE_API_KEY` - API key. `PUMBLESDK_API_KEY_AUTH` is also read as
  a fallback.
- `PUMBLE_BASE_URL` - API base URL override. `PUMBLESDK_SERVER_URL` is
  also read as a fallback.

## Write command output

Write commands (`send`, `dm`, `channels create`, `status set`/`clear`,
`schedule cancel`) print a one-line success message by default. Pass `--quiet`
to suppress it, or `--json` to emit the full structured receipt
instead.

## Commands

| Command | Summary |
| --- | --- |
| `whoami` | Confirms the API key and prints the current user |
| `doctor` | Local health check; redacts the API key and runs offline |
| `channels list` / `channels find <name-or-id>` / `channels create <name>` | Channel discovery and creation |
| `users find <email-or-id>` | User discovery |
| `send <channel> <text>` | Send a message |
| `dm <user> <text>` | Direct message |
| `search <query>` | Search messages |
| `messages <channel>` | List channel messages |
| `thread <message-id> --channel <channel>` | Fetch a thread |
| `status set <emoji> <text>` / `status clear` | Set/clear your status |
| `schedule list` / `schedule cancel <id>` | Scheduled messages |
| `help` | Show help |

## Examples

```bash
pumble-keys doctor
pumble-keys whoami
pumble-keys channels list --json
pumble-keys send '#general' "ship it"
pumble-keys search "release"
```
