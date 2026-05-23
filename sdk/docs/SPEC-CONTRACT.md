# OpenAPI spec contract

`PumbleOpenApi.yaml` is the single source for the generated raw SDK and is treated as a contract.

## Required fields per operation

- `operationId` (camelCase, stable).
- `tags` (one or more).
- `description` or `summary` (one sentence).
- `responses` (at least `200` or `204`, plus `4xx` where applicable).
- For write operations (`post`, `put`, `patch`, `delete`): explicit `x-speakeasy-retries`. Use `*noWriteRetries` (`strategy: none`) for non-idempotent writes and `*safeReadRetries` for read-shaped POSTs.
- For paginated operations: `x-speakeasy-pagination` block aligned with the runtime helpers.

## Drift control

- Last live validation date is recorded at the top of the file.
- `npm run spec:audit` enforces every required field. CI uploads the audit report as an artifact.
- Live verification (`npm run verify:live`) catches schema drift in returned payloads.

## Forbidden in examples

- Live Pumble emails (only `example.com`, `example.org`, `example.invalid`, `example.net`).
- 24-character hex IDs other than placeholder hex IDs.
- Bearer tokens, API keys, cookies.

`tests/spec-quality-audit.test.ts` fails if any of the above leak in.
