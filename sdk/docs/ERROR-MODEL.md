# Error model

Different surfaces raise failures in different shapes — this page tells you which to expect.

## Decision tree

```
raw SDK call → throws (catch + categorizeError)
facade call  → returns { ok, value | error } (check ok or assertFacadeOk)
CLI command  → exits non-zero with redacted stderr
MCP tool     → returns { ok: false, error } envelope
webhooks     → handler throws → 500 with structured payload
```

## Categories (`categorizeError`)

- `permission` — 401/403 or scoped failures.
- `not-found` — 404 or missing target after resolution.
- `rate-limit` — 429 (respects `Retry-After`).
- `validation` — local zod or server 400 with details.
- `transient` — 5xx, timeouts, network resets.
- `unknown` — everything else.

## Examples

### Raw SDK

```ts
try {
  await sdk.messages.sendMessage(req);
} catch (err) {
  const cat = categorizeError(err);
  if (cat === "rate-limit") await delay(1000);
}
```

### Facade — guarded

```ts
const sent = await client.messages.send({ channel: "#general", text: "hi" });
if (!sent.ok) {
  if (sent.reason === "channel-not-found") {
    // handle not-found
  }
}
```

### Facade — assert

```ts
import { assertFacadeOk } from "pumble-sdk/extensions/index.js";
const value = assertFacadeOk(await client.messages.send({ channel: "#general", text: "hi" }));
```

### MCP

Agents receive `{ ok: false, error: { category, message } }`. Tools never throw across the wire.

### CLI

Non-zero exit; `stderr` shows category and a one-line message. Use `--json` for structured detail.
