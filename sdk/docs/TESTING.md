# Test taxonomy

| Category | What it proves | Representative files |
| --- | --- | --- |
| Unit | Pure functions and façade logic | `tests/categorize-error.test.ts`, `tests/resolve.test.ts`, `tests/with-retries.test.ts`, `tests/facade-internals.test.ts`, `tests/facade-writes.test.ts`, `tests/client-facade.test.ts`, `tests/client-resolver-cache.test.ts`, `tests/thread-context.test.ts`, `tests/webhooks.test.ts`, `tests/rate-limiter.test.ts`, `tests/retries.test.ts`, `tests/telemetry.test.ts` |
| Docs | User-facing docs stay correct and free of forbidden phrases | `tests/docs.test.ts`, `tests/release-evidence.test.ts`, `tests/patch-burndown.test.ts`, `tests/spec-quality-audit.test.ts`, `tests/goal-registry.test.ts` |
| Generated-runtime guard | Patches applied by `scripts/patch-generated-runtime.mjs` survive regen | `tests/generated-runtime-patch.test.ts`, `tests/generated-request-validation.test.ts`, `tests/response-validation.test.ts`, `tests/debug-redaction.test.ts` |
| Package smoke | Tarball install reproduces public exports + bins | `tests/package-metadata.test.ts`, `tests/examples.test.ts`, `tests/package-split-dry-run.test.ts`, `tests/ci-workflow.test.ts`, `tests/release-workflow.test.ts` |
| Replay contract | Recorded HTTP fixtures still satisfy current code | `tests/replay.test.ts`, `tests/search-all.test.ts` (replay mode) |
| Live contract | Sacrificial workspace API still behaves as the SDK assumes | run by `scripts/verify-live.mjs`, `scripts/run-arazzo-live.mjs`, `scripts/run-facade-live.mjs`; gated by `tests/verify-live.test.ts`, `tests/live-smoke-*.test.ts` |
| MCP safety | Curated MCP excludes destructive tools and keeps writes behind preview/confirm | `tests/mcp-agent-safety.test.ts`, `tests/mcp-tool-manifest.test.ts`, `tests/mcp-curated-*.test.ts`, `tests/pumble-mcp.test.ts`, `tests/pumble-mcp-curated.test.ts`, `tests/dry-run-shim.test.ts` |
| CLI smoke | CLI commands surface predictable output and exit codes | `tests/cli.test.ts` |

## Replay fixture freshness

Fixtures live in `tests/fixtures/`. They are re-recorded when:

1. Spec validation date is bumped in `PumbleOpenApi.yaml`.
2. A live workflow fails and the failure is shown to be drift, not a regression.

## Live workspace setup

`scripts/live-env.mjs` resolves credentials in this order: `PUMBLE_API_KEY`, `~/.pumble-keys-sdk/live.env`, then aborts. The sacrificial workspace has its own channel set. Never point live tests at a production workspace.
