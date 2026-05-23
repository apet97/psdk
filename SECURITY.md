# Security

Do not report secrets in issues, pull requests, logs, prompts, or replay
fixtures.

Sensitive values include Pumble API keys, webhook signatures, user emails,
message text, workspace names, and live 24-character Pumble IDs.

Use a private channel for vulnerability reports. Include reproduction steps,
affected version, and redacted logs.

## MCP SSE

Prefer stdio for local MCP clients. When SSE is required, bind to localhost and
set a bearer token:

```bash
pumble-mcp start --transport sse --host 127.0.0.1 --auth-token "$PUMBLE_MCP_TOKEN"
```

Only bind SSE to `0.0.0.0` for intentional network exposure, and use
`--auth-token` outside local development.
