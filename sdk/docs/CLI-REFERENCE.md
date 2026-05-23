# CLI reference

Run `pumble --help` for a top-level overview. Every command supports `--json` unless noted.

## Global flags

- `--api-key-auth <key>` / `--api-key <key>` (legacy direct; prefer env or file)
- `--api-key-file <path>`
- `--api-key-stdin`
- `--base-url <url>`
- `--timeout-ms <n>`
- `-v` / `--verbose` — print extra detail
- `-q` / `--quiet` — suppress the default one-line success output for writes
- `--version` — print the package version
- `-h` / `--help`

## Write command output

Write commands (`send`, `dm`, `channels create`, `status set`/`clear`,
`schedule cancel`) print a one-line success message by default. Pass `--quiet`
to suppress it, or `--json` to emit the full structured receipt instead.

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
| `thread <message-id>` | Fetch a thread |
| `status set <emoji> <text>` / `status clear` | Set/clear your status |
| `schedule list` / `schedule cancel <id>` | Scheduled messages |
| `help` | Show help |

## Examples

```bash
pumble doctor
pumble whoami
pumble channels list --json
pumble send '#general' "ship it"
pumble search "release"
```
