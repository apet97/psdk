# Non-idempotent writes do not retry

Status: Accepted

## Context

A write is duplicate-creating when a silent retry can create a second
user-visible object or leave a confusing lost-response state: the server
accepted the first request, but the client never saw the response and retries
into a second create.

## Decision

Duplicate-creating writes disable generated automatic retries unless the API
documents and verifies an idempotency key. The current set:
`sendMessage`, `sendReply`, `dmUser`, `dmGroup`, `createScheduledMessage`,
`createChannel`. Writes where a retry is idempotent or fails loudly instead
(`addReaction`, `addUsersToChannel`, `removeUserFromChannel`, edits, deletes,
`customStatus`) stay out of the set.

Speakeasy does not honor an operation-level no-retry strategy in generated
output, so duplicate-creating writes are tagged `x-sdk-no-write-retries: true`
in the spec for traceability, and the generated runtime patch clears their
default retry codes after regeneration. Safe read operations carry explicit
`x-speakeasy-retries` backoff config.

## Consequences

Facade, CLI, MCP, and raw SDK writes prefer a single attempt by default.
Callers may still opt into request-level retries explicitly, but the SDK does
not hide duplicate-write risk behind defaults.

The patch clears default **status-code** retries only. A caller who sets
`retryConnectionErrors: true` on a global `retryConfig` still gets a backoff
retry on a dropped connection or timeout for these six writes — the same
lost-response duplicate-create risk this ADR exists to prevent. That knob is
an explicit opt-in outside the default posture, not a gap in the patch, but
callers relying on this ADR's guarantee must leave `retryConnectionErrors`
unset (or `false`) for duplicate-creating writes.
