# Generated-runtime patch burndown

Five patches are applied to generated SDK code by `scripts/patch-generated-runtime.mjs`. Each row lists the file patched, the behavior the patch protects, the test that guards it, and the condition under which the patch can be removed.

| ID | File | Protects | Test | Removal condition |
| --- | --- | --- | --- | --- |
| non-idempotent-write-retries | `src/funcs/messages-*.ts`, `src/funcs/scheduled-messages-create-scheduled-message.ts` | Drops default retries on writes that are not idempotent | `tests/retries.test.ts`, `tests/with-retries.test.ts` | Speakeasy generator supports operation-level no-retry config; expressed in spec via `x-speakeasy-retries: { strategy: none }`. |
| debug-redaction | `src/lib/sdks.ts` | Redacts headers/bodies in generated debug output | `tests/debug-redaction.test.ts` | Generator emits a logger hook we can plug into. |
| malformed-json-response | `src/lib/sdks.ts` | Wraps JSON parse failures as `ResponseValidationError` | `tests/response-validation.test.ts` | Generator wraps JSON parse failures. |
| outbound-write-validation | `src/lib/sdks.ts` | Validates request bodies before sending | `tests/generated-request-validation.test.ts` | OpenAPI/schema generation emits the current outbound constraints unaided. |
| retry-backoff-first-delay | `src/lib/sdks.ts` | Honors initial-interval on non-Retry-After backoff | `tests/retries.test.ts` | Generator backoff respects initial interval. |

## Rules

- Adding a new patch requires updating `PATCH-COUNT.txt`, this table, and ADR 0008.
- Removing a patch requires confirmation that the protecting test still passes without it (`npm run build && npm test`).
- See `docs/SPEC-CONTRACT.md` for which constraints belong in `PumbleOpenApi.yaml` instead of patches.
