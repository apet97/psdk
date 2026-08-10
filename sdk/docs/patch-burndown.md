# Generated-runtime patch burndown

Patches are applied to generated SDK code by `scripts/patch-generated-runtime.mjs`. Each row lists the files patched, the behavior the patch protects, the tests that guard it, and the condition under which the patch can be removed. `docs/PATCH-COUNT.txt` carries the current count.

| ID | File | Protects | Test | Removal condition |
| --- | --- | --- | --- | --- |
| non-idempotent-write-retries | `src/funcs/messages-send-message.ts`, `src/funcs/messages-send-reply.ts`, `src/funcs/messages-dm-user.ts`, `src/funcs/messages-dm-group.ts`, `src/funcs/scheduled-messages-create-scheduled-message.ts` | Clears default retry status codes on duplicate-creating writes when a user sets a global retryConfig | `tests/retries.test.ts`, `tests/with-retries.test.ts` | Speakeasy config/templates support operation-level no-retry generation for these writes. |
| debug-redaction | `src/lib/sdks.ts` | Redacts headers/bodies in generated debug output | `tests/debug-redaction.test.ts` | Generator emits a logger hook we can plug into. |
| malformed-json-response | `src/lib/matchers.ts` | Wraps JSON parse failures as `ResponseValidationError` | `tests/response-validation.test.ts` | Generator wraps JSON parse failures. |
| outbound-write-validation | `src/models/operations/send-message.ts`, `src/models/operations/send-reply.ts`, `src/models/operations/dm-user.ts`, `src/models/operations/dm-group.ts`, `src/models/operations/create-scheduled-message.ts` | Validates request bodies before sending | `tests/generated-request-validation.test.ts` | OpenAPI/schema generation emits the current outbound constraints unaided. |
| retry-backoff-first-delay | `src/lib/retries.ts` | Honors initial-interval on non-Retry-After backoff | `tests/retries.test.ts` | Generator backoff respects initial interval. |

## Rules

- Adding a new patch requires updating `PATCH-COUNT.txt`, this table, and ADR 0008.
- Removing a patch requires confirmation that the protecting test still passes without it (`npm run build && npm test`).
- See `docs/SPEC-CONTRACT.md` for which constraints belong in `PumbleOpenApi.yaml` instead of patches.
