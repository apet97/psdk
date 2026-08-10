# Pumble SDK error model

Five surfaces, three failure styles. This page is the agent-readable
summary; the long-form is [`docs/ERRORS.md`](../../docs/ERRORS.md).

## By surface

- **Raw SDK** (`new PumbleSDK(...)`) — throws on any non-2xx response.
  Errors are subclasses of `PumbleSDKError`:
  `LegacyError`, `StructuredError`, `ResponseValidationError`,
  `SDKValidationError`, `ConnectionError`, `RequestTimeoutError`,
  `RequestAbortedError`, `InvalidRequestError`,
  `UnexpectedClientError`. The category of an error is recoverable
  via `categorizeError(err).category`.
- **Facade** (`createPumbleClient(...)`) — operations return
  `FacadeResult<T> = { ok: true, summary, ids, data, nextActions }`
  on success and `{ ok: false, summary, error: { category, raw } }`
  on failure. Failures are values, not throws; this lets agents
  branch on `result.ok` instead of wrapping every call in try/catch.
  `assertFacadeOk(result)` exists for callers that prefer throws.
- **CLI** (`pumble-keys ...`) — exit code 0 on success, 2 on usage
  errors (missing args, unknown command), 1 on operation failure.
  Mutating commands are quiet on success unless `--verbose` or
  `--json` is passed; failures print a one-line summary to stderr
  plus a "Run \`pumble-keys --help\` for usage." hint on usage
  errors.
- **Curated MCP** (`pumble-keys-mcp` with default profile) — every
  tool returns the same `{ ok, summary, ids, data, nextActions }`
  envelope so agents do not have to learn per-tool error shapes.
  Write tools split into `*_preview` (cheap diff) and
  `*_confirmed` (commit) so an agent can show the user the change
  before performing it.
- **Webhook handler** — verifies the signature, dispatches typed
  events to your handler, and translates exceptions into HTTP
  status codes for Pumble's retry behavior. A bad signature returns
  401; a handler exception returns 5xx so Pumble retries. Handlers
  must be idempotent.

## Categories

`categorizeError` returns one of:

- `auth` — 401/403, missing or invalid API key. Do not retry on
  auth errors; surface to the operator.
- `rate-limit` — 429 with a `Retry-After` header. The SDK's
  built-in retry helper waits for the header value and tries again.
- `bad-request` — 400 with a structured `code`. Fix the request
  shape and retry; do not loop.
- `not-found` — 404 for an id or name that does not exist.
- `conflict` — 409 for create operations whose target already
  exists.
- `server` — 5xx. The retry helper backs off and retries
  idempotent operations; non-idempotent writes are surfaced
  immediately (see ADR 0006).
- `network` — DNS, TCP, TLS, or timeout failure. Retry once at a
  longer interval before surfacing.

## Pointers

- Long-form taxonomy: [`docs/ERRORS.md`](../../docs/ERRORS.md).
- Per-class details: [`docs/ERRORS.md`](../../docs/ERRORS.md).
- Why facade failures are values:
  [`docs/adr/0002-facade-failures-are-values.md`](../../docs/adr/0002-facade-failures-are-values.md).
- Why non-idempotent writes do not retry:
  [`docs/adr/0006-non-idempotent-writes-do-not-retry.md`](../../docs/adr/0006-non-idempotent-writes-do-not-retry.md).
