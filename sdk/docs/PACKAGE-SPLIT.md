# Package Split Decision Matrix

`pumble-sdk` intentionally ships as one npm package today. The generated API
layer, hand-written facades, app helpers, test fixtures, and curated MCP
server are still being hardened together, so keeping one package preserves
stable import paths while those seams settle.

The future split is documented here so extraction can happen deliberately
instead of by directory drift.

| Future package | Current source of truth | Extraction readiness |
|---|---|---|
| `@pumble/sdk-core` | Generated SDK, models, and public client facade exports. | Ready only after generated imports and facade imports are documented and stable. |
| `@pumble/webhooks` | `src/extensions/webhooks.ts` and app event routing helpers. | Ready only after webhook signing, event dispatch, and retry semantics stay green in tests and live checks. |
| `@pumble/testing` | Replay recorder/replayer, fixture sanitizer, dry-run helpers, and public testing helpers. | Ready only after fixture scan and pack smoke prove no secrets, tests, scripts, or examples leak into publish artifacts. |
| `@pumble/app-framework` | `PumbleApp`, install lifecycle gates, OAuth placeholders, and socket-mode guardrails. | Ready only after public APIs are documented without promising unsupported install or socket behavior. |
| `@pumble/mcp` | MCP wrapper binaries plus curated tools, prompts, resources, and safety evals. | Ready only after curated read/write workflows remain the default and raw generated tools stay opt-in. |

## Extraction Gates

All gates must pass before creating separate packages:

1. Public APIs for each future package are documented with supported import
   paths.
2. Existing import paths are stable or covered by compatibility exports and
   migration tests.
3. `npm run test:pack` is green and still rejects tarball bloat.
4. Two live runs are green against the sacrificial workspace, including Arazzo
   workflows and live search tests.
5. There are no hand patches in generated source; fixes flow through
   `PumbleOpenApi.yaml`, Speakeasy config, or hand-written facade code.

## Decision

Do not split packages yet. Revisit extraction only after the gates above are
proven in the release checklist and the dry-run mapper shows docs and tests for
every future package.
