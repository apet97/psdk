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
  `FacadeResult<T> = ({ ok: true, summary } & T)` on success and
  `{ ok: false, reason, summary, choices, nextActions, cause? }` on
  failure, where `reason` is one of `not_found` | `ambiguous` |
  `invalid_request` | `api_error` | `transport_error`. Failures are
  values, not throws; this lets agents branch on `result.ok` instead
  of wrapping every call in try/catch. `assertFacadeOk(result)` exists
  for callers that prefer throws.
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

`categorizeError(err)` returns a `CategorizedError` whose `category`
is one of:

- `permission` — 401, or a 403 without a structured body. Auth or
  scope failure; do not retry, surface to the operator.
- `not-found` — 404, or a target that does not exist after
  resolution.
- `rate-limit` — 429. Retryable; the retry helper respects
  `Retry-After`.
- `validation` — a structured 403, or a 400/422 carrying structured
  error detail (local zod or server). Fix the request; do not loop.
- `transient` — 408, 425, any 5xx, or a network error (connection
  reset/refused, timeout, DNS). Retryable with backoff; note that
  non-idempotent writes are surfaced immediately (see ADR 0006).
- `unknown` — anything else. Not retryable by default.

The exact union is defined by `ErrorCategory` in
`src/extensions/categorize-error.ts`; keep this list in sync with it.

## Pointers

- Long-form taxonomy: [`docs/ERRORS.md`](../../docs/ERRORS.md).
- Per-class details: [`docs/ERRORS.md`](../../docs/ERRORS.md).
- Why facade failures are values:
  [`docs/adr/0002-facade-failures-are-values.md`](../../docs/adr/0002-facade-failures-are-values.md).
- Why non-idempotent writes do not retry:
  [`docs/adr/0006-non-idempotent-writes-do-not-retry.md`](../../docs/adr/0006-non-idempotent-writes-do-not-retry.md).
