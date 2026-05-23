# Facade failures are values

Status: Accepted

## Context

The Facade resolves human channel and user targets before writing. Normal target
misses and ambiguity are expected user-facing outcomes, not exceptional runtime
crashes.

## Decision

Facade helpers return structured failure values for not-found and ambiguous
target resolution. Missing facade write targets also return failure values
instead of thrown errors. Callers that prefer exceptions can opt in through
`assertFacadeOk`.

## Consequences

Facade write code must preserve receipt and failure shapes. New Facade seams
should keep failures local and testable as values, while transport or generated
SDK failures can still throw normally.
