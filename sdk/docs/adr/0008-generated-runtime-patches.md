# ADR 0008: Generated Runtime Patches

Status: Accepted

## Context

The SDK is generated from the Pumble OpenAPI document, but a few runtime fixes
still need local patches until they can move into generator configuration,
templates, or the upstream spec.

## Accepted Patches

| Patch | Owner | Why it remains | Removal condition |
| --- | --- | --- | --- |
| `non-idempotent-write-retries` | `sdk-maintainers` | Removes default retries from non-idempotent generated writes. | Speakeasy config/templates support operation-level no-retry generation. |
| `debug-redaction` | `sdk-maintainers` | Redacts sensitive headers and bodies in generated debug output. | Generator supports safe debug logger hooks. |
| `malformed-json-response` | `sdk-maintainers` | Wraps malformed JSON responses in `ResponseValidationError`. | Generator wraps JSON parse failures as `ResponseValidationError`. |
| `outbound-write-validation` | `sdk-maintainers` | Validates generated write request bodies before sending. | OpenAPI/schema generation emits the current outbound constraints without patching. |
| `retry-backoff-first-delay` | `sdk-maintainers` | Starts non-`Retry-After` generated backoff after the initial interval. | Generator backoff starts after the configured initial interval. |

## Test Requirement

`tests/generated-runtime-patch.test.ts` must guard the patch registry and the
generated hunks that each patch leaves in `src/`.

## Exit Condition

Remove a patch only after the same behavior is supplied by generator support,
Speakeasy configuration, templates, or the OpenAPI source, with the guard test
updated in the same change.

## See also

- `docs/patch-burndown.md` — current patch list + removal conditions.
- `docs/PATCH-COUNT.txt` — single integer guarded by `tests/patch-burndown.test.ts`.
