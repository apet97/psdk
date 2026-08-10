# Agent protocol

This is the canonical doc for any agent (human, LLM, or CI bot)
working in this repo. CLAUDE.md is a shorter pointer doc for Claude
Code's project-memory slot; it must not contradict this file.

## 1. Repository at a glance

`pumble-keys-sdk` is a TypeScript SDK and curated MCP server for the
**Pumble API-Keys add-on**
(`https://pumble-api-keys.addons.marketplace.cake.com`, static `ApiKey`
header issued from *Workspace settings -> API keys*). It is the right
choice for scripting your own Pumble workspace from a server or
letting an agent operate inside it.

`pumble-keys-sdk` is an independent, personal open-source project. It is
not affiliated with, endorsed by, or sponsored by CAKE.com Inc. or
Pumble; "Pumble" and "CAKE.com" are trademarks of their respective
owners. Licensed MIT (see `LICENSE`); the upstream knowledge lift is
ISC-attributed in `sdk/THIRD_PARTY_NOTICES.md`.

This package is **not** a fork or competitor of CAKE.com's official
`pumble-sdk`, which targets a different Pumble surface:

- npm: <https://www.npmjs.com/package/pumble-sdk>
- GitHub: <https://github.com/CAKE-com/pumble-node-sdk>

The official `pumble-sdk` handles the Pumble apps platform (OAuth
install flow, slash commands, modals/views, Socket Mode). Our
`pumble-keys-sdk` handles the API-Keys add-on. They are
non-overlapping and we lift typed event/block definitions from
`pumble-sdk` under ISC attribution for our knowledge resources, but
we do not re-implement its framework.

Doc map: [`sdk/docs/INDEX.md`](sdk/docs/INDEX.md). The agent-facing
knowledge tree lives under `sdk/knowledge/` and is exposed through
the curated MCP server via `pumble://knowledge/{+path}` and
`pumble://events/{name}`.

## 2. Working directories

```
psdk/                       repo root  (CONTEXT.md, AGENTS.md, CLAUDE.md, .goals/)
  sdk/                      npm package root  (package.json, src/, tests/, docs/, knowledge/, scripts/, bin/)
  docs/                     repo-level docs (ADRs 0001-0007, product/, superpowers/prompts/)
  officialsdk/              local clone of CAKE-com/pumble-node-sdk (gitignored; opt-in)
  PumbleOpenApi.yaml        spec source of truth for the generated SDK
```

`cd sdk` before running tests/build/lint/verify. All npm scripts
(`npm run verify:offline`, `npm test`, `npm run lint`, etc.) live in
`sdk/package.json` and resolve script paths relative to `sdk/`.

## 3. Generated vs handwritten boundary

The following paths are regenerated from `PumbleOpenApi.yaml` via
Speakeasy (with one sanctioned post-gen patch script) and must
**never** be hand-edited. They will be silently overwritten on the
next `speakeasy run`. The authoritative source is
`.goals/manifest.yaml#guardrails.generated_paths`:

- `sdk/src/funcs/**`
- `sdk/src/sdk/**`
- `sdk/src/models/**`
- `sdk/src/lib/**`
- `sdk/src/hooks/**`
- `sdk/src/types/**`
- `sdk/src/core.ts`
- `sdk/src/index.ts`
- `sdk/src/mcp-server/*.ts` (root files only; `curated/` is handwritten)
- `sdk/src/mcp-server/build.mts`
- `sdk/src/mcp-server/cli/**`
- `sdk/src/mcp-server/tools/**`

To change generated behavior, edit one of:

- `PumbleOpenApi.yaml` (the spec)
- `sdk/.speakeasy/gen.yaml` (Speakeasy generation config)
- `sdk/scripts/patch-generated-runtime.mjs` (the sanctioned post-gen
  patch script; its `PATCH_REGISTRY` lists every patch and its
  removal condition)

Tests pinning the boundary: `sdk/tests/generated-runtime-patch.test.ts`,
`sdk/tests/generated-request-validation.test.ts`.

## 4. The `.goals/` system

Each substantive change is scoped by one YAML file under `.goals/`.
A goal yaml lists `scope.allowed`, `scope.forbidden`, `acceptance`
criteria, `adversarial_checks`, `commands`, and a `rollback` line.
Status progresses `planned -> active -> done` (`blocked` is also valid).
A goal with `status: done` MUST link at least one test path in
`links.tests` that exists on disk; `sdk/scripts/goal-check.mjs` (run
inside `verify:offline`) enforces this.

`.goals/README.md` is the workflow doc; `.goals/manifest.yaml` is the
list of all goals plus the guardrails. The schema is pinned by
`sdk/tests/goal-registry.test.ts` and the script behavior is pinned
by `sdk/tests/goal-check.test.ts`.

## 5. TDD requirement

Write the test first, see it fail (red), write minimal code to make
it pass (green), then commit. Doc-only changes that introduce a
contract (a new claim about an endpoint, a new exported symbol, a new
MCP surface) get a guard test in the same commit so future drift is
caught.

`verify-before-completion` is mandatory before claiming a task done:
run `cd sdk && npm run verify:offline` and confirm exit 0. Do not
claim success based on output you have not seen.

## 6. The offline gate

Every commit must keep this pipeline green:

```
verify:offline =
  npm run goals:check
  && node scripts/attribution-audit.mjs
  && node scripts/version-consistency.mjs
  && npm run spec:audit
  && npm run build
  && npm run lint
  && npm test
  && npm run test:arazzo:replay
  && npm run test:live:replay
  && npm run test:fixtures:scan
  && npm run test:pack -- --skip-build
```

Never skip with `--no-verify`. Never delete a test to make CI green.
Never disable a test with `xit`/`xdescribe` or `it.skip` without a
linked deferred follow-up. If a hook or test fails, investigate the
root cause; do not bypass.

## 7. Knowledge tree

`sdk/knowledge/` ships agent-readable static content in two halves
and is included in the npm tarball.

- `sdk/knowledge/native/` - curated by us. Each file is ≤8 KB and
  has H1 + ≥2 H2 sections (pinned by
  `sdk/tests/knowledge-native.test.ts`). Glossary, API shape, error
  model.
- `sdk/knowledge/upstream/` - tightly-scoped lift from
  `CAKE-com/pumble-node-sdk` (ISC). Events + V1 block types only;
  framework, OAuth install flow, modals runtime, and Socket Mode are
  explicitly out of scope. Regenerate via
  `sdk/scripts/refresh-knowledge.mjs` from a local clone at
  `officialsdk/pumble-node-sdk/` (gitignored).

Attribution headers are MANDATORY on every upstream file:

```
@derived-from CAKE-com/pumble-node-sdk
@upstream-path <pumble-sdk relative path>
@license ISC
```

`sdk/scripts/attribution-audit.mjs` fails the offline gate if any
required marker is missing, if a file on disk is unlisted in
`sdk/THIRD_PARTY_NOTICES.md`, or if the notices file lists a path
that no longer exists.

## 8. Adding MCP tools, resources, and prompts

Curated MCP surface lives entirely under
`sdk/src/mcp-server/curated/`. To add one, register it in the
matching file and update the matching `CURATED_*_NAMES` export:

| Kind | File | Names export |
| --- | --- | --- |
| Read tool | `read-tools.ts` | `CURATED_TOOL_NAMES` (aggregated in `tools.ts`) |
| Write tool | `write-tools.ts` | `CURATED_WRITE_TOOL_NAMES` |
| Resource | `resources.ts` | `CURATED_RESOURCE_NAMES` |
| Prompt | `prompts.ts` | `CURATED_PROMPT_NAMES` |

Shared curated plumbing: `targets.ts` (channel/user resolution),
`payloads.ts` (result envelopes), `types.ts`, `server.ts`, `cli.ts`.

Add a test that pins the manifest (`sdk/tests/mcp-tool-manifest.test.ts`
snapshots tools; resource and prompt names are pinned by
`sdk/tests/mcp-curated-resources.test.ts`,
`sdk/tests/mcp-knowledge-resources.test.ts`, and
`sdk/tests/mcp-knowledge-prompts.test.ts`). Snapshot updates require
eyeballing the diff before accepting.

For resources that read from disk: add a path-traversal guard via
`path.resolve` + `startsWith(ROOT + sep)` and a probe test that
exercises `../`, absolute paths, URL-encoded `%2E%2E`, and null bytes.

## 9. Version bumps

Three files move together; do not bump one without the others:

1. `sdk/package.json#version`
2. A `## <version>` heading in `CHANGELOG.md` (repo root)
3. `sdk/docs/verification/v<version>.md`

`sdk/scripts/version-consistency.mjs` fails `verify:offline`
otherwise. The script tolerates an `Unreleased` section and
pre-release suffixes (e.g. `0.4.0-rc.1`). It does **not** enforce
that the package version is the latest CHANGELOG heading - the
CHANGELOG keeps history.

Release evidence (`sdk/docs/verification/v<version>.md`) is generated
by `sdk/scripts/write-release-evidence.mjs`. See
[`sdk/docs/VERSIONING.md`](sdk/docs/VERSIONING.md) for the full release runbook.

## 10. Forbidden phrases

The product identity guard in `sdk/tests/docs.test.ts` fails the
suite if any of these phrases appears in a markdown file outside
`docs/product/sdk-generator-product-boundary.md`. These come from
`.goals/manifest.yaml#guardrails.forbidden_phrases`:

- `SDK generator platform`
- `Stainless competitor`
- `multi-language generator`
- `production-grade`
- `industrial-strength`
- `world-class`
- `best-in-class`

We are not a generic SDK generator platform; we are a Pumble-specific
TypeScript SDK that happens to use Speakeasy to generate one tier.
Do not market it otherwise.

## 11. Commit and PR hygiene

- Conventional-commit prefix: `feat:`, `fix:`, `docs:`, `test:`,
  `chore:`, `refactor:`, `perf:`, `build:`, `ci:`.
- One logical change per commit. Bundle a guard test with the
  feature/fix it pins in the same commit.
- Subject line ≤72 characters; body explains WHY rather than
  restating WHAT (the diff already shows what).
- No force pushes to `main`. No `--no-verify`. No `--no-gpg-sign`.
- No `git rebase --no-edit`. No `git add -A` or `git add .` -
  stage explicit files so secrets and build artefacts cannot slip in.
- Pull requests are titled with a scope and goal id where one
  applies (e.g. `polish-followup: adversarial review (...)`,
  `G33: cross-doc version-consistency gate`).

## 12. What we do NOT do

Out of scope; do not lift, port, or re-implement these even if
upstream provides them:

- Pumble apps bot framework (OAuth install flow, multi-workspace
  token storage, install/uninstall lifecycle handlers). Recorded
  exception: `sdk/src/extensions/app/` (including `token-store.ts`
  and `oauth.ts`) stays as isolated, experimental helpers per the
  G08 decision (`.goals/G08-app-helpers-decision.yaml`); do not
  extend it into a bot host.
- Slash command runtime, shortcut runtime, modal/view-submission
  runtime, `ack()` semantics.
- Socket Mode runtime (we have an experimental helper but it is not
  a complete bot host).
- New runtime dependencies in `sdk/package.json#dependencies`. Dev
  deps are allowed if minimal and justified in the commit body.
- Renaming exported runtime API names. The package name and bins
  moved in G26 (`pumble-sdk` -> `pumble-keys-sdk`,
  `pumble`/`pumble-mcp` -> `pumble-keys`/`pumble-keys-mcp`); after
  that, exported symbol names stay stable.
- Live tests or `speakeasy run` from inside an automated agent.
  Offline-only. Live verification is a separate gated workflow.
