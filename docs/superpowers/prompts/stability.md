# Stability audit

Use with Claude Code: enter plan mode, paste this prompt, then execute
inside the repo you want to audit (defaults to pumble-keys-sdk itself; usable
against any Pumble addon).

---

## Prompt

Audit this project for production stability. Focus on whether the
runtime survives the failure modes a busy Pumble workspace produces.

### 1. Error handling completeness

- Every async handler catches its errors and either logs or returns a
  structured failure - no unhandled rejections, no uncaught
  exceptions reaching the top-level process.
- Pumble app handlers (slash, shortcut, view-submission) call
  `ctx.ack()` on every path including error paths. Missing acks
  trigger SDK retries, which compound the original failure.
- For pumble-keys-sdk itself: façade handlers return value failures
  (`{ ok: false, summary, ... }`) rather than throwing. Raw SDK
  methods can throw - that's by design; façades wrap them.
- Bot/user client null-checks before every Pumble API call
  (`getUserClient()` can return undefined in OAuth-app flows; pumble-keys-sdk's
  resolver / facade helpers do their own existence checks).

### 2. Crash resilience

- SIGTERM / SIGINT handlers in main / shutdown paths clean up timers,
  in-flight requests, open DB connections.
- `setInterval` / `setTimeout` retention paths are `unref`'d if they
  must not block process exit.
- No global mutable state that two concurrent webhook requests can
  race on. Resolver cache, audit log writer, telemetry proxy must be
  documented as safe-for-concurrency (or guarded with a lock).
- `process.on("uncaughtException")` / `process.on("unhandledRejection")`
  exist and log structured output before exiting.

### 3. Outbound HTTP failure handling

- Every outbound call has a finite timeout (typically 30 s ceiling).
- Reads can retry with exponential backoff + `Retry-After` honoured.
- Non-idempotent writes (`sendMessage`, `editMessage`,
  `deleteMessage`, DM creators, channel creators, scheduled-message
  creators) MUST NOT auto-retry on 5xx unless the caller passed an
  explicit idempotency key. See pumble-keys-sdk ADR-0006.
- 429 responses honour `Retry-After` (seconds OR HTTP-date).
- Generated SDK retry hook only runs on the operations marked
  `*safeReadRetries` in `PumbleOpenApi.yaml`; non-idempotent writes are
  tagged `x-sdk-no-write-retries: true` and have retry codes cleared by
  the generated runtime patch.

### 4. Webhook handler durability

- Signature verification runs on the RAW body, not a parsed body.
- Replay protection: timestamp staleness check (±5 min typical).
- Constant-time signature compare (`crypto.timingSafeEqual`).
- Body-size cap enforced BEFORE parsing (typical: 1 MiB).
- Malformed JSON returns 400, not 500.
- Handler failure returns 500 (so Pumble retries) without leaking
  internals into the response body.
- Probe tests exist for: missing signature, wrong signature, stale
  timestamp, oversized body, malformed JSON, handler throw.

### 5. Audit log behaviour

- Audit log writer is best-effort: a write failure logs once to
  stderr and never crashes the request loop.
- Audit log redacts API keys, signing secrets, message bodies,
  emails, and 24-char Pumble IDs.
- Audit log path is operator-configurable; default is sensible.

### 6. Tests for the failure paths

- Negative tests outnumber positive tests for the boundary layer
  (webhook verification, signature timing, retry classification).
- Subprocess-spawning tests are deterministic (no flakes from
  shared sockets / TCP races / unbounded buffers).

### Output

Findings as `OK / GAP / FLAG` rows in a Markdown checklist.
- `OK` cites file:line evidence.
- `GAP` proposes a one-commit fix with a guard test (TDD).
- `FLAG` stops for input - typically when the fix needs a design
  decision or touches code outside this repo.

Reference: pumble-keys-sdk at `https://github.com/apet97/psdk` for
the canonical Pumble stability patterns (façade failure-value model,
categorizeError taxonomy, with-retries shape, telemetry proxy
behaviour, ADRs 0001-0007).
