# Contributing

The SDK package lives in `sdk/`.

Read `CONTEXT.md` and then `AGENTS.md` (the canonical agent-facing
protocol doc) before substantive work. `sdk/CONTRIBUTING.md` has the
SDK-specific developer workflow.

## One change = one goal yaml = one commit

Each substantive change is scoped by a YAML file under `.goals/` (see
`.goals/README.md`). The yaml lists `scope.allowed` paths,
`scope.forbidden` paths, `acceptance` criteria, `adversarial_checks`,
`commands`, and a `rollback` line. `sdk/scripts/goal-check.mjs`
validates the registry as part of `verify:offline` - a goal with
`status: done` must link at least one test file that exists on disk.

## Do not hand-edit generated files

Generated paths are listed in
[`.goals/manifest.yaml#guardrails.generated_paths`](.goals/manifest.yaml)
and in [`CONTEXT.md`](CONTEXT.md#generated-directories). To change
generated behavior, edit `PumbleOpenApi.yaml`,
`sdk/.speakeasy/gen.yaml`, or
`sdk/scripts/patch-generated-runtime.mjs` (the sanctioned post-gen
patch script). Never bypass with `--no-verify` or test deletions.

## Knowledge tree

`sdk/knowledge/` is split:

- `native/` - curated by us; small (≤8 KB per file) agent-readable
  Pumble documentation (glossary, API shape, error model).
- `upstream/` - ISC-attributed lift from `CAKE-com/pumble-node-sdk`.
  Refresh via `sdk/scripts/refresh-knowledge.mjs` from a local clone
  at `officialsdk/pumble-node-sdk/`. Never hand-edit upstream files.

Every upstream file carries three required attribution markers
(`@derived-from CAKE-com/pumble-node-sdk`, `@upstream-path`,
`@license ISC`) and is listed in
[`sdk/THIRD_PARTY_NOTICES.md`](sdk/THIRD_PARTY_NOTICES.md).
`sdk/scripts/attribution-audit.mjs` fails the offline pipeline if any
of those invariants drifts.

## Before you commit

```bash
cd sdk
npm run verify:offline
```

The pipeline runs `goal-check`, `attribution-audit`,
`version-consistency`, `spec:audit`, `build`, `lint`, tests, replay
suites, fixture scan, pack smoke, and benchmark smoke. It must exit 0.

Use conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `test:`,
`chore:`, `refactor:`). One logical change per commit.
