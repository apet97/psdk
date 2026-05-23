# Live smoke output is redacted

Status: Accepted

## Context

Live smoke scripts run against real workspaces and handle API keys, live user
emails, and live Pumble IDs. Their logs may be copied into issue reports or
agent transcripts.

## Decision

Live smoke output is redacted before printing final payloads or failure context.
Secret-looking keys, email fields, email-like strings, and live 24-character
hex IDs must not appear in final live output.

## Consequences

Live smoke scripts route final payloads and operation context through shared
redaction helpers. New live output must be tested for redaction before it is
trusted as evidence.
