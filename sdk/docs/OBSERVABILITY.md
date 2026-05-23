# Observability

The SDK ships **optional** telemetry. If `@opentelemetry/api` is not installed, the recorder is a no-op.

## Recipes

### Disable (default)

No code needed. No spans, no events.

### OpenTelemetry

```ts
import { trace } from "@opentelemetry/api";
import { PumbleSDK } from "pumble-sdk";
import {
  createOTelSpanRecorder,
  wrapClient,
} from "pumble-sdk/extensions/telemetry.js";

const sdk = wrapClient(
  new PumbleSDK({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! }),
  { recorder: createOTelSpanRecorder({ tracer: trace.getTracer("pumble-sdk") }) },
);
```

### JSONL audit writer

```ts
import {
  createJsonlAuditWriter,
  wrapClient,
} from "pumble-sdk/extensions/telemetry.js";

const sdk = wrapClient(rawSdk, {
  writer: createJsonlAuditWriter("./audit.jsonl"),
});
```

## Redaction guarantee

Recorded args contain only whitelisted ID/cursor fields (e.g. `channelId`,
`userId`, `messageId`, `workspaceId`, `limit`, `cursor`). Message text,
attachments, and user-provided content never appear in spans or the audit
log. The CLI's `--audit-log` and the curated MCP audit log share the same
whitelist.
