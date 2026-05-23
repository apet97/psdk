# Security checklist

Run before every release; CI runs an automated subset.

## Secrets

- [ ] No API keys appear in docs, fixtures, examples, or tests.
- [ ] No live Pumble emails outside `example.com`, `example.org`, `example.invalid`.
- [ ] No raw 24-char Pumble IDs outside placeholder hex IDs.
- [ ] No bearer tokens, cookies, or workspace IDs in fixtures.
- [ ] Debug logs redact: auth headers, message text, emails, IDs, status text.
- [ ] Audit log redacts the same set (curated MCP raw-write profile).
- [ ] CLI never prints raw `--api-key` value back to the user.

## Webhooks

- [ ] Signature verification rejects body tampering.
- [ ] Stale timestamp tolerance default ≤ 5 minutes.
- [ ] Raw body order preserved before signature check.

## MCP

- [ ] Curated profile is the default in published binary.
- [ ] SSE bound to `127.0.0.1` and requires a bearer token.
- [ ] Audit log path required when `--allow-raw-writes` is on.

## CI

- [ ] `scripts/scan-fixtures.mjs` runs on every push.
- [ ] Forbidden-phrase guard runs on every push.
- [ ] Spec audit runs on every push.
