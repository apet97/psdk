# Security

Do not report secrets in issues, pull requests, logs, prompts, or replay
fixtures.

Sensitive values include Pumble API keys, webhook signatures, user emails,
message text, workspace names, and live 24-character Pumble IDs.

Report vulnerabilities privately. Use GitHub private vulnerability reporting on
this repository — open the **Security** tab, then **Report a vulnerability**
(<https://github.com/apet97/psdk/security/advisories/new>). Include reproduction
steps, the affected version, and redacted logs.

Do not include Pumble API keys, tokens, cookies, message bodies, or private
workspace data in public issues or in the report.

## Organization Deployments

For organization deployments:

- Store API keys in server-side secret managers.
- Prefer env/file/stdin secret input for CLI.
- Use curated MCP by default.
- Require `--allow-raw-writes --audit-log <path>` for raw MCP writes.
- Keep audit logs in restricted storage.
- Verify live smoke output is redacted before sharing.

## MCP SSE

Prefer stdio for local MCP clients. When SSE is required, bind to localhost and
set a bearer token:

```bash
pumble-keys-mcp start --transport sse --host 127.0.0.1 --auth-token "$PUMBLE_MCP_TOKEN"
```

Only bind SSE to `0.0.0.0` for intentional network exposure, and use
`--auth-token` outside local development.
