# Retries, timeouts, rate limits

## Defaults

| Surface | Retry codes | Max retries | Initial backoff | Honors Retry-After |
| --- | --- | --- | --- | --- |
| Generated reads (GET) | 408, 429, 5xx | 3 | 500ms | yes |
| Generated writes (POST/PUT/PATCH/DELETE) | none | 0 | — | n/a |
| Façade reads | same as generated | same | same | yes |
| Façade writes | none by default | 0 | — | n/a |

Writes do not retry by default because most Pumble write endpoints are not idempotent. Use `withRetries(operation, { … })` for opt-in retries on writes you own.

The spec contract (`docs/SPEC-CONTRACT.md`) enforces a per-operation `x-speakeasy-retries` declaration so this table stays accurate as the spec evolves.

## Timeouts

```ts
import { PumbleSDK } from "pumble-sdk";

const sdk = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
  timeoutMs: 10_000,
});
```

Default: none (uses the runtime's fetch default). Per-call: pass `signal` from an `AbortController`.

## Rate limiting

`createRateLimiter` is a **process-local** token bucket. It can shape this process's outbound traffic but cannot coordinate across processes.

```ts
import { createRateLimiter } from "pumble-sdk/extensions/index.js";

const limiter = createRateLimiter({ tokensPerSecond: 5, burst: 10 });
await limiter.acquire(); // throws on AbortSignal cancellation
```

For multi-process fan-out, coordinate externally (job queue, shared service) — the SDK does not pretend to.

## withRetries helper

```ts
import { withRetries, categorizeError } from "pumble-sdk/extensions/index.js";

await withRetries(() => client.messages.send({ channel: "#general", text: "ping" }), {
  retries: 3,
  initialDelayMs: 250,
  retryOn: (err) => categorizeError(err) === "transient",
});
```

`withRetries` respects the supplied `signal`, returns the operation's result on success, and throws the last error on exhaustion.
