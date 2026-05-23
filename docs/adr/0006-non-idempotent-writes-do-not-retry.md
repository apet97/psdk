# Non-idempotent writes do not retry

Status: Accepted

## Context

Message creation endpoints can duplicate user-visible writes when a retry
happens after the server accepted the first request but before the client saw
the response.

## Decision

Non-idempotent message-creating operations disable generated automatic retries
unless the API documents and verifies an idempotency key.

The generator does not accept an operation-level `strategy: none` marker in
this repo. Safe read operations carry explicit retry config, and the generated
runtime patch clears default retry codes for message-creating writes after
regeneration.

## Consequences

Facade, CLI, MCP, and raw SDK writes prefer a single attempt by default.
Callers may still opt into request-level retries explicitly, but the SDK does
not hide duplicate-write risk behind defaults.
