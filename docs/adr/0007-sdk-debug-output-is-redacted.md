# SDK debug output is redacted

Status: Accepted

## Context

Generated debug logging can see credentials, message bodies, live Pumble IDs,
emails, headers, and error details.

## Decision

SDK debug and audit output redacts secrets, message text, emails, signatures,
and live IDs by default. Raw body logging is not enabled by environment
variables.

Generated debug logging uses the regeneration patch because the local
Speakeasy config does not expose a narrow logging customization.

## Consequences

Debug output is safer to paste into issue reports. Anyone needing raw wire data
must make an explicit local-only change outside normal SDK defaults.
