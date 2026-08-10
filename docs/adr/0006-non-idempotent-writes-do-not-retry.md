# Non-idempotent writes do not retry

Status: Accepted

## Context

Message creation endpoints can duplicate user-visible writes when a retry
happens after the server accepted the first request but before the client saw
the response.

## Decision

Non-idempotent message-creating operations disable generated automatic retries
unless the API documents and verifies an idempotency key.

Speakeasy does not honor an operation-level no-retry strategy in generated
output, so non-idempotent writes are tagged `x-sdk-no-write-retries: true` for
traceability and the generated runtime patch clears their default retry codes
after regeneration. Safe read operations carry explicit `x-speakeasy-retries`
backoff config.

## Consequences

Facade, CLI, MCP, and raw SDK writes prefer a single attempt by default.
Callers may still opt into request-level retries explicitly, but the SDK does
not hide duplicate-write risk behind defaults.
