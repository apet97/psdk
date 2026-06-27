# Code quality audit

Use with Claude Code: enter plan mode, paste this prompt, then execute
inside the repo you want to audit (defaults to SDKP itself; usable
against any Pumble addon).

---

## Prompt

Audit this project for code quality. Focus on patterns that don't
cause incidents on their own but compound into expensive maintenance
over time.

### 1. Type safety

- No `any` casts that could be replaced with a precise type.
- No unsound `as` assertions that bypass the type checker. If used,
  comment explains the invariant the cast relies on.
- Every exported function has an explicit return type (no inference
  leaking through the public surface).
- Branded ID types (`ChannelId`, `UserId`, `MessageId`, `WorkspaceId`)
  are used at boundary functions; raw `string` only inside untyped
  internals. SDKP defines these in `sdk/src/extensions/ids.ts`.

### 2. Interface consistency

- All repository / data-access interfaces follow the same shape:
  `workspaceId` parameter first, return type explicit, errors
  documented.
- Service interfaces match their implementations exactly (no
  divergence between `.d.ts` and `.ts`).
- Error handling pattern is consistent: handlers either return
  value failures or throw - they do not mix the two on different
  branches of the same function.

### 3. Generated / handwritten boundary

For SDKP and any project that ships Speakeasy-generated code:

- No hand edits in generated paths (the list lives in
  `.goals/manifest.yaml#guardrails.generated_paths`). A guard test
  walks the tree and asserts no marker comments (`// EDITED` or
  similar) have been added.
- Post-generation patches live ONLY in
  `sdk/scripts/patch-generated-runtime.mjs` and each patch has a
  registered removal condition in `PATCH_REGISTRY`.
- The generated package metadata is normalized by
  `scripts/normalize-package.mjs` after every regen, so npm package
  name, bin entries, and `files` allowlist do not drift.

### 4. Test taxonomy

- Tests are categorised: unit (single function, no I/O), guard
  (pin a contract that should never regress), integration (multiple
  modules wired together), smoke (end-to-end against a fixture).
- The taxonomy is reflected in npm scripts (`test:unit`, `test:docs`,
  `test:mcp`, `test:guards`, etc.) - a fast subset for local
  iteration, the full set for CI.
- No `it.skip` / `test.skip` / `xit` / `xdescribe` without a linked
  follow-up issue and a removal date.

### 5. Lint hygiene

- A lint step is wired into CI on at least the primary Node version
  (matches `engines.node` in package.json).
- `--max-warnings=0` so warnings cannot accumulate.
- Lint rules cover at minimum: unused imports, unused vars, missing
  return types on exports, no-explicit-any.

### 6. Naming + convention drift

- Old package / bin / npm-scope names do not appear outside
  intentional historical contexts (CHANGELOG entries, attribution
  files, migration recipes).
- A grep / guard test catches drift: e.g. for SDKP, no
  `pumble-sdk` references outside the `pumble-keys-sdk` boundary
  doc, the attribution context, the generated user-agent token, or
  the `PumbleSDKError` class name.

### 7. Forbidden phrases

- Every project has a `.goals/manifest.yaml#guardrails.forbidden_phrases`
  list (or equivalent). The phrases capture identity claims the
  project does NOT make ("SDK generator platform", "Stainless
  competitor", "production-grade", etc. for SDKP).
- A guard test asserts the phrases appear ONLY inside an explicitly
  allow-listed boundary doc (and, where relevant, AGENTS.md /
  CLAUDE.md). A regression that smuggles marketing language into
  prose fails the test.

### 8. Commit + PR hygiene

- Every commit on `main` follows the conventional-commit prefix
  (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, ...).
- Subject ≤72 chars; body explains WHY.
- No `--no-verify` on any commit; if a hook fails, the root cause
  is fixed.
- One logical change per commit; bundle a guard test with the
  feature/fix it pins.

### Output

Findings as `OK / GAP / FLAG` rows in a Markdown checklist with
file:line evidence. GAPs get a TDD fix. FLAGs stop for input.

Reference: SDKP at `https://github.com/apet97/psdk` for
the canonical patterns - `.goals/manifest.yaml`, AGENTS.md sections 3
and 10, the `sdk/tests/docs.test.ts` product-identity guard, and the
`sdk/tests/goal-registry.test.ts` schema enforcement.
