# Security audit

Use with Claude Code: enter plan mode, paste this prompt, then execute
inside the repo you want to audit (defaults to pumble-keys-sdk itself; usable
against any Pumble addon).

---

## Prompt

Audit this project for production security. Focus on the boundaries
where a real Pumble workspace's secrets, message content, or user
identity can leak or be abused.

### 1. Secret hygiene

- No real API keys, signing secrets, OAuth client secrets, install
  tokens, or user emails in any tracked file. Run:
  ```bash
  git grep -nE 'xpat-|xpcls-|xpss-|[0-9a-f]{32,}|PUMBLE_[A-Z_]+_KEY=' \
    | grep -vE '\.env\.(example|template|sample)|\.md:.*placeholder'
  ```
  Inspect every hit and confirm it's a format-doc placeholder, a
  regex pattern in code, or a redaction-path list.
- `.env*` (excluding `.env.example`, `.env.template`, `.env.sample`)
  is gitignored AND not in git history. If ever committed, ROTATE
  the secret; do not just `rm` the file.
- The CI workflow runs the "Check no secrets are tracked" step
  (greps git ls-files for `.env`, `tokens.json`, `*.db`, `*.pem`).
  See pumble-keys-sdk `.github/workflows/ci.yml` for the canonical recipe.
- No live workspace IDs, channel IDs, user IDs, or message IDs in
  tracked fixtures. Use synthetic 24-char hex placeholders.

### 2. Logging redaction

- Log writer redacts: API keys (named `*_KEY`, `*_SECRET`, `*_TOKEN`),
  `Authorization` and `x-app-token` and `token` headers,
  `messageText`, `replyText`, top-level + one-level-deep `body.text`,
  emails, and 24-char hex Pumble IDs.
- Test asserts the redaction works end-to-end against a sample
  payload.
- No log line embeds raw Pumble error messages verbatim in
  user-facing strings (Pumble errors can contain debugging hints
  that leak structure).

### 3. Webhook signature path

If the project receives Pumble webhooks (slash, shortcut, event,
view-action):

- HMAC over `${timestamp}:${rawBody}` (raw bytes, not parsed JSON).
- `crypto.timingSafeEqual` for the compare; never `===` or
  `Buffer.compare`.
- Timestamp staleness check (±5 min); rejects replays.
- Body-size cap BEFORE parse (1 MiB typical); rejects with 413.
- Malformed JSON returns 400, not 500.
- Negative tests for each: missing sig, wrong sig, stale ts,
  oversized body, malformed JSON, handler throw.

### 4. Identity & boundary

- Addon explicitly declares its surface (API-Keys add-on vs Pumble
  app OAuth). The wrong assumption breaks at signup.
- For Pumble apps: NO hardcoded `pumble.com` / `cake.com` base URLs
  in addon code. URLs come from JWT claims at install time and from
  the install record at runtime.
- For Pumble apps: `X-Addon-Token` (or `token` header in OAuth
  flow) is used; never raw `Authorization`.
- Install record stored server-side only. Never in frontend code,
  frontend bundle, logs, or test fixtures.

### 5. MCP boundary (if the project exposes an MCP surface)

- Resource handlers that read from disk have a path-traversal guard
  (`path.resolve(ROOT, requested).startsWith(ROOT + sep)`).
- Probes for: `../`, absolute paths (`/etc/passwd`), URL-encoded
  `%2E%2E`, NUL bytes, empty / whitespace inputs.
- Event resource handlers reject names outside an explicit allow-list.
- Destructive tools (`delete*`, `archive*`, `remove*`) never appear
  in a `readonly` profile manifest.
- Write tools use preview/confirm (see pumble-keys-sdk `confirmed-writes.ts`)
  or require `--allow-raw-writes --audit-log <path>` flags.
- SSE transport binds to `127.0.0.1` by default; bearer-token
  required for remote SSE.

### 6. Attribution & licensing

If the project lifts code from upstream (e.g. CAKE-com/pumble-node-sdk):

- Every lifted file carries three markers (`@derived-from
  <repo>`, `@upstream-path <path>`, `@license <SPDX>`).
- `THIRD_PARTY_NOTICES.md` ships in the npm tarball (inside the
  package root, not above it) and contains the full license
  permission text.
- An attribution-audit script wired into CI fails the build when
  the markers drift or the notices file falls out of sync. See
  pumble-keys-sdk `sdk/scripts/attribution-audit.mjs` for the recipe.

### 7. Authorization

- Every inbound mutating route checks the install token / API key /
  signature BEFORE doing the work.
- Cross-workspace data isolation: every database query for tenant
  data includes a `workspaceId` predicate, even on single-tenant
  deployments.

### 8. Network

- All outbound URLs are `https://` (no plain `http://` for
  production endpoints).
- TLS 1.2+ on inbound (typically enforced at the reverse proxy).

### Output

Findings as `OK / GAP / FLAG` rows in a Markdown checklist. Cite
file:line evidence for OK. For GAP, propose a TDD fix (red first).
For FLAG, stop for input.

Reference: pumble-keys-sdk at `https://github.com/apet97/psdk` for
canonical patterns - `sdk/scripts/attribution-audit.mjs`,
`sdk/src/extensions/webhooks.ts`,
`sdk/src/mcp-server/curated/resources.ts` (path-traversal guard),
`sdk/THIRD_PARTY_NOTICES.md`, `sdk/docs/MCP-SAFETY.md`,
`sdk/docs/SECURITY-CHECKLIST.md`.
