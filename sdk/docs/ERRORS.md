# Error Handling

## Decision tree

```
raw SDK call → throws (catch + categorizeError)
facade call  → returns { ok: false, reason, summary, ... } (check ok or assertFacadeOk)
CLI command  → exits non-zero (2 usage, 1 runtime) with a one-line stderr message
MCP tool     → target failures return { ok: false, summary, data.reason, nextActions };
               SDK/transport failures surface as MCP tool errors (isError: true)
```

## Facade failures are values

Facade target problems and facade API/transport failures return
`{ ok: false, reason, summary, choices, nextActions }`. The `reason` is one of
`not_found`, `ambiguous`, `invalid_request`, `api_error`, or `transport_error`.
API and transport failure values include `cause` for diagnostics. Use
`assertFacadeOk` when you prefer exceptions.

```ts
const sent = await client.messages.send({ channel: "#general", text: "hi" });
if (!sent.ok) {
  if (sent.reason === "not_found") {
    // handle a missing channel
  }
}
```

```ts
import { assertFacadeOk } from "pumble-keys-sdk/extensions/index.js";
const receipt = assertFacadeOk(await client.messages.send({ channel: "#general", text: "hi" }));
```

## Raw SDK methods throw

Generated resource methods such as `sdk.messages.sendMessage()` unwrap the
internal `Result` and throw SDK errors.

## Error Model By Surface

| Surface | Failure shape | Use when |
| --- | --- | --- |
| Raw SDK (`new PumbleSDK`) | Throws generated SDK errors such as `PumbleSDKError`, `PumbleSDKDefaultError`, `SDKValidationError`, and `ResponseValidationError`. | You want direct endpoint access and normal try/catch behavior. |
| Facade (`createPumbleClient`) | Returns `{ ok: false, summary, reason, nextActions }` for resolver and operation failures. | You want resolve-before-act workflows and printable receipts. |
| Lower-level helpers | Return `Result` or typed helper values where documented. | You are composing SDK internals or tests. |
| CLI (`pumble-keys`) | Prints a one-line error to stderr, then exits 2 for usage errors and 1 for runtime errors. | You are scripting shell workflows. |
| MCP (`pumble-keys-mcp`) | Returns JSON-like tool envelopes with `ok`, `summary`, `ids`, `data`, and `nextActions`; unexpected SDK/transport failures become MCP tool errors. | You are exposing Pumble workflows to agents. |

```ts
try {
  await sdk.messages.sendMessage({ channelId, text });
} catch (error) {
  const categorized = categorizeError(error);
  console.error(categorized.message);
}

const result = await client.messages.send({ channel: "#ops", text });
if (!result.ok) {
  console.error(result.summary);
}
```

## ResponseValidationError

Malformed or schema-invalid responses are reported as `ResponseValidationError`.
The error includes the request, response, raw body, and validation cause.

## categorizeError

Use `categorizeError(error)` for logs and retry decisions. It returns a
`CategorizedError` with `category`, `retryable`, `statusCode`, and `message`.
The categories are:

- `permission` — 401/403.
- `not-found` — 404.
- `rate-limit` — 429 (retryable; honor `Retry-After`).
- `validation` — local zod failures or a server 400/structured 403.
- `transient` — 5xx, timeouts, network resets (retryable).
- `unknown` — everything else.

```ts
try {
  await sdk.messages.sendMessage(req);
} catch (err) {
  const categorized = categorizeError(err);
  if (categorized.category === "rate-limit") {
    // wait, then retry
  }
}
```

Plain `401` and `403` responses are categorized as `permission`. A `403` with
Pumble's structured validation body (`localizedMessage`, numeric `code`, or a
message plus validation field details) is categorized as `validation`.

## Lower-level Result

Advanced callers can import generated functions from `pumble-keys-sdk/funcs/...`
when they need lower-level Result values instead of thrown raw SDK methods.
