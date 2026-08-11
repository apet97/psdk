# Generated-runtime patch burndown

Patches are applied to generated SDK code by `scripts/patch-generated-runtime.mjs`. Each row lists the files patched, the behavior the patch protects, the tests that guard it, and the condition under which the patch can be removed. `docs/PATCH-COUNT.txt` carries the current count.

| ID | File | Protects | Test | Removal condition |
| --- | --- | --- | --- | --- |
| non-idempotent-write-retries | `src/funcs/messages-send-message.ts`, `src/funcs/messages-send-reply.ts`, `src/funcs/messages-dm-user.ts`, `src/funcs/messages-dm-group.ts`, `src/funcs/scheduled-messages-create-scheduled-message.ts`, `src/funcs/channels-create-channel.ts` | Clears default retry status codes on the six duplicate-creating writes when a user sets a global retryConfig | `tests/retries.test.ts`, `tests/with-retries.test.ts`, `tests/generated-runtime-patch.test.ts` | Speakeasy config/templates support operation-level no-retry generation for these writes. |
| debug-redaction | `src/lib/sdks.ts` | Redacts headers/bodies in generated debug output | `tests/debug-redaction.test.ts` | Generator emits a logger hook we can plug into. |
| malformed-json-response | `src/lib/matchers.ts` | Wraps JSON parse failures as `ResponseValidationError` | `tests/response-validation.test.ts` | Generator wraps JSON parse failures. Regenerated with Speakeasy 1.763.6 on 2026-08-11: inconclusive, see note below. |
| outbound-write-validation | `src/models/operations/send-message.ts`, `src/models/operations/send-reply.ts`, `src/models/operations/dm-user.ts`, `src/models/operations/dm-group.ts`, `src/models/operations/create-scheduled-message.ts` | Validates request bodies before sending | `tests/generated-request-validation.test.ts` | OpenAPI/schema generation emits the current outbound constraints unaided. Regenerated with Speakeasy 1.763.6 on 2026-08-11: inconclusive, see note below. |
| retry-backoff-first-delay | `src/lib/retries.ts` | Honors initial-interval on non-Retry-After backoff | `tests/retries.test.ts` | Generator backoff respects initial interval. Regenerated with Speakeasy 1.763.6 on 2026-08-11: inconclusive, see note below. |

## 2026-08-11 regen probe: inconclusive

Three patches were probe targets: `outbound-write-validation`,
`malformed-json-response`, `retry-backoff-first-delay` (their rows above
carry this note). `non-idempotent-write-retries` and `debug-redaction`
were never probe targets — they carry no probe date because facts 5 and 6
in the plan's evidence base already showed the generator cannot express
their behavior today (no operation-level no-retry config; no safe debug
logger hook), so probing them would not have told us anything new.

A regen with Speakeasy 1.763.6 succeeded (after prior attempts failed on
unrelated `package.json`/config drift, since fixed). The plan's probe
method reads each candidate file's pristine (unpatched) content before the
patch script runs, to check whether the generator now emits the constraint
unaided. That pristine content was never visible this run: Speakeasy's own
`persistentEdits` mechanism merges the patch script's prior diffs back into
the freshly generated files *during generation itself* (its "Merging custom
edits" step), before the executor sees any output. All three probe-target
files came out of the regen already in their patched state, byte-identical
to what was already committed — evidence that `persistentEdits` is carrying
the patches forward, not evidence about what the generator emits unaided.
No patch was removed. A real probe would need to either inspect Speakeasy's
pre-merge snapshot directly (not currently exposed to the executor) or
temporarily disable `persistentEdits` for one run — out of scope to improvise
here.

The regen also broke twice on `gen.yaml`/`package.json` drift (missing
`additionalScripts` entries, then a `typescript.version` trailing
package.json's by one release) before it ran cleanly — both caught by hand,
not by any gate. `scripts/gen-config-consistency.mjs` (G38) now checks that
drift on every `verify:offline` run.

## Rules

- Adding a new patch requires updating `PATCH-COUNT.txt`, this table, ADR 0008,
  and `tests/generated-runtime-patch.test.ts` (see ADR 0008's Test Requirement).
- Removing a patch follows ADR 0008's Exit Condition: the same behavior must
  come from generator support, Speakeasy configuration, templates, or the
  OpenAPI source, with the guard test updated in the same change.
- See `docs/SPEC-CONTRACT.md` for which constraints belong in `PumbleOpenApi.yaml` instead of patches.
