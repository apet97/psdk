# Performance audit

Use with Claude Code: enter plan mode, paste this prompt, then execute
inside the repo you want to audit (defaults to pumble-keys-sdk itself; usable
against any Pumble addon).

---

## Prompt

Audit this project for performance under realistic load. Pumble
workspaces produce bursty traffic (a workspace-wide notification can
fan out hundreds of webhook deliveries within seconds), and the SDK /
addon needs to survive that without queuing up retries that compound
the problem.

### 1. Hot-path latency

If the project handles Pumble slash commands or shortcuts:

- Pumble requires `ctx.ack()` within 3 seconds. Trace the critical
  path from handler entry to ack and confirm:
  - No blocking DB calls before ack (better-sqlite3 is synchronous).
  - No outbound Pumble API call before ack.
  - No filesystem write before ack.
- The work that follows ack runs on a background task / queue, not
  on the request thread, so a slow downstream cannot starve the
  ack budget.

For pumble-keys-sdk itself:

- Facade methods that fan out to multiple raw endpoints (e.g.
  resolver pre-flight) batch where possible.
- `searchAllMessages` walks pages with bounded concurrency and a
  cap (see `sdk/src/extensions/search-all.ts`); a runaway query
  cannot consume unbounded memory.

### 2. Bundle / tarball size

- `npm pack --dry-run` reports a total under the documented budget
  (pumble-keys-sdk's is 2.5 MB; pinned by `tests/package-metadata.test.ts`).
- Tarball excludes `tests/`, `scripts/`, `examples/`, `.speakeasy/`,
  `coverage/`, source maps that are not strictly needed.
- No accidentally bundled dev dependencies (run `npm pack`,
  extract, look for `node_modules/`).
- Generated bin output (`bin/mcp-server.js`, `bin/pumble-mcp-curated.js`)
  is minified or at least not duplicated across builds.

### 3. Dependency footprint

- `npm ls --depth=0` shows only the dependencies the runtime needs.
- No transitive duplicates (`npm dedupe` clean).
- Heavy deps with lighter alternatives are flagged (e.g. moment.js
  for date math; axios when fetch would do; zod has a smaller
  alternative for simple schemas).
- Dev deps don't leak into the production build - verify by
  inspecting the built `dist/` or `esm/` tree.

### 4. Hot-path memory

- Resolver cache documents its eviction policy. If unbounded,
  document that explicitly (pumble-keys-sdk: off by default, opt-in
  bounded `ttlMs`, no background refresh, explicit `refresh()` and
  `clearCache()` only - per ADR-0004).
- Audit log writer streams append-only - does not buffer the entire
  log in memory.
- Webhook handler streams the body via a chunk concat with a hard
  cap, not via `request.text()` which buffers everything.

### 5. SQLite (if applicable)

- WAL mode + `busy_timeout` configured.
- Rate-limit / counter columns use `INTEGER` not `TEXT`.
- Indices on every `WHERE` column that's filtered in a hot path.
- No `SELECT *` in a hot path - explicit columns only.

### 6. Concurrency

- Per-request state lives on the request, not on a module-level
  global.
- Shared mutable state (resolver cache, telemetry proxy) is either
  documented as concurrency-safe or guarded.
- Pumble's webhook delivery can be parallel; idempotency-by-design
  on every state-mutating operation that an addon owns.

### 7. Replay + bench smoke

- A replay fixture suite runs offline and is deterministic.
- A bench-smoke script (typically <10 s, no external services)
  catches order-of-magnitude regressions in the inner loop (token
  bucket, fixture lookup, telemetry proxy) when the project keeps
  one; assertion-free benches that only print numbers are noise —
  delete them or give them budgets.

### 8. Coverage instrumentation cost (when CI runs --coverage)

- The `v8` coverage provider adds ~10-20% to test runtime; keep
  the coverage gate OUT of the local `verify:offline` pipeline so
  iteration stays fast. CI calls `test:coverage` as a separate step.

### Output

Findings as `OK / GAP / FLAG` rows with file:line evidence.
- `OK`: pin baseline numbers where useful (tarball size, bench
  smoke ms/op, dependency count).
- `GAP`: propose a TDD fix; for performance, the test usually
  asserts a budget (e.g. "tarball must stay under 2.5 MB").
- `FLAG`: stop for input on anything that requires changing the
  runtime architecture.

Reference: pumble-keys-sdk at `https://github.com/apet97/psdk` for
the canonical patterns - `tests/package-metadata.test.ts` (tarball
budget), `ADR-0004` (resolver cache
explicit semantics), `extensions/with-retries.ts` (bounded backoff),
`extensions/search-all.ts` (bounded full-walk).
