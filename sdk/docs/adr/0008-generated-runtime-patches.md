# ADR 0008: Generated Runtime Patches

Status: Accepted

## Context

The SDK is generated from the Pumble OpenAPI document, but a few runtime fixes
still need local patches until they can move into generator configuration,
templates, or the upstream spec.

## Accepted Patches

- `non-idempotent-write-retries`: remove default retries from non-idempotent
  generated write operations.
- `debug-redaction`: redact sensitive headers and bodies in generated debug
  output.
- `malformed-json-response`: wrap malformed JSON responses in
  `ResponseValidationError`.
- `outbound-write-validation`: validate generated write request bodies before
  sending.
- `retry-backoff-first-delay`: start non-`Retry-After` generated backoff after
  the initial interval.

## Test Requirement

`tests/generated-runtime-patch.test.ts` must guard the patch registry and the
generated hunks that each patch leaves in `src/`.

## Exit Condition

Remove a patch only after the same behavior is supplied by generator support,
Speakeasy configuration, templates, or the OpenAPI source, with the guard test
updated in the same change.
