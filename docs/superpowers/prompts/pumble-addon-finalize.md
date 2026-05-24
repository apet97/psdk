# Adversarially review and finalize a Pumble addon

Hand this prompt to Claude Code (or any capable coding agent) inside
the addon's working tree. The agent reads the SDKP repo as its
reference, runs an adversarial review, fixes what's safe, flags what
needs decisions, and drives the addon to a ship-ready state.

## Single-theme alternative

If you want a focused audit on one concern (instead of the full
end-to-end finalize workflow), use the themed prompts in this
directory. Each is standalone and runnable on its own:

- [`stability.md`](stability.md) - error handling, crash resilience,
  outbound HTTP failure, webhook durability, audit log behaviour.
- [`security.md`](security.md) - secret hygiene, logging redaction,
  webhook signature path, MCP boundary, attribution + licensing,
  authorization, network.
- [`code-quality.md`](code-quality.md) - type safety, interface
  consistency, generated/handwritten boundary, test taxonomy, lint
  hygiene, naming drift, forbidden phrases, commit + PR hygiene.
- [`performance.md`](performance.md) - hot-path latency (ack budget),
  tarball size, dependency footprint, hot-path memory, SQLite,
  concurrency, replay + bench smoke.

The end-to-end workflow below subsumes all four. Use it when you
want a single review pass that lands a ship-ready PR; use the themed
prompts when you want to spot-check one dimension.

---

## Inputs you must fill in before starting

Replace the bracketed values inline before pasting:

- **Addon path:** `[ABSOLUTE PATH TO ADDON REPO]`
- **Addon type:** `[Pumble API-Keys add-on | Pumble app (OAuth)]`
- **Working branch:** `[BRANCH NAME, e.g. polish-followup]`
  (cut from `origin/main`; do not work on `main` directly).
- **What "final" means here:** `[e.g. marketplace submission ready;
  internal staging deploy; PR opened against main]`.
- **Known issues / context to keep in mind:** `[bullet list, or
  "none"]`.

If any of these are missing, stop and ask the user.

---

## Mission

Take the addon at the path above from its current state to the
defined "final" state via the same discipline the SDKP repo enforces
on itself:

1. Adversarial review against a Pumble-specific probe checklist.
2. Findings written as a Markdown checklist that becomes the first
   commit on the working branch.
3. Each real and low-risk finding fixed with a guard test in the
   same commit (TDD: red first when adding behaviour, regression
   coverage when pinning existing behaviour). Findings that need a
   design decision are flagged in the review and stopped on.
4. Cross-doc cleanup so README, manifest, env templates, and any
   developer docs reflect the post-fix state.
5. Final gate (tests + lint + type + secret-scan + build + any
   addon-specific verify) green. PR opened against `main` with a
   per-phase deliverable body, or merged according to the user's
   workflow.

Constraints throughout:

- No `--no-verify`, no `--force` to main, no `xit`/`xdescribe`, no
  test deletions to make CI green. If a gate fails, fix the root
  cause.
- One logical change per commit; conventional prefix; subject ≤72
  chars; body explains WHY.
- Trust SDKP's conventions where they apply; don't reinvent them.
  Do not lift code from SDKP into the addon; reference its docs and
  copy patterns (with attribution if the addon also serves as a
  knowledge source).

---

## Reference material (SDKP repo)

Repo: `/Users/15x/Downloads/WORKING/addons-me/SDKP`
Remote: <https://github.com/apet97/psdk>

Open before touching the addon:

- `AGENTS.md` (repo root) - canonical 12-section agent protocol; the
  conventions for `.goals/`, generated boundary, offline gate,
  knowledge tree, commit hygiene, and out-of-scope items live here.
- `CLAUDE.md` (repo root) - pointer doc; defers to AGENTS.md.
- `sdk/docs/INDEX.md` - doc map.
- `sdk/docs/MCP-SAFETY.md` - MCP profile boundaries, knowledge
  resources, prompts. Use this if the addon exposes its own MCP.
- `sdk/knowledge/native/glossary.md` - Pumble vocabulary
  (`aId`/`cId`/`mId`/`tx`/`eph`/`wId`/`ty`).
- `sdk/knowledge/native/api-shape.md` - request/response shapes
  used by `pumble-keys-sdk` (transferable to any Pumble addon).
- `sdk/knowledge/native/error-model.md` - error categorisation.
- `sdk/knowledge/upstream/events/index.ts` - typed `Notification*`
  payload definitions for every Pumble event.
- `sdk/knowledge/upstream/events/README.md` - field-name boundary
  for OAuth-app event payloads.
- `sdk/knowledge/upstream/blocks/types.ts` - V1 block/view/element
  type slice (read-only reference).
- `.goals/manifest.yaml` - `guardrails.forbidden_phrases` and
  `guardrails.generated_paths`. Mirror the *spirit* of these
  guardrails into the addon's own conventions.
- `sdk/scripts/attribution-audit.mjs` - pattern for an additive
  ISC/attribution gate if the addon also lifts upstream code.
- `sdk/scripts/version-consistency.mjs` - pattern for an additive
  cross-doc version gate.
- `sdk/THIRD_PARTY_NOTICES.md` - attribution header format the
  addon should adopt if it bundles upstream code.

If the addon hosts an MCP surface, use the `pumble-keys-readwrite`
MCP server (already registered in this Claude Code session - see
`claude mcp list | grep pumble-keys`) for *read* probes against a
sandbox workspace. Never call destructive Pumble tools without
explicit user confirmation; the curated MCP's preview/confirm
contract is the model.

`PUMBLE_API_KEY` is sourced from
`/Users/15x/Downloads/WORKING/addons-me/pumble-mcp-pro/.env` via
`~/.claude/mcp-launchers/pumble-keys-readwrite.sh`. Use this key
only against a sandbox workspace; never against a customer
workspace.

---

## Phase 1: Discover (no code changes)

Inside the addon path, gather:

- `git status`, `git log -10 --oneline`, current branch, divergence
  from `origin/main`.
- `package.json` (or equivalent): name, version, scripts, deps,
  devDeps, engines, files allowlist, bin entries.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` -
  presence and last-modified.
- Manifest file if marketplace addon (e.g. `manifest.json`,
  `pumble.yaml`, `addon.json`): all scopes, OAuth redirect URIs,
  webhook URLs, slash commands, shortcuts, modals, event subscriptions.
- `.env*` files and any other config that could hold secrets;
  enumerate keys (NOT values).
- CI config (`.github/workflows/*`, `.circleci/`, etc.): lint,
  test, type, build, secret-scan stages and which branches they
  run on.
- Test layout: framework, total test files, total tests, any
  `*.skip.*` or `xit`/`xdescribe` patterns, coverage gates.
- Database / storage layer: schema files, migrations, multi-workspace
  scoping (is `workspaceId` on every row?).
- Outbound HTTP: which Pumble endpoints are called; whether base
  URLs are hardcoded or derived (for OAuth-apps, extract from JWT
  claims; never hardcode).

Produce a one-page "Addon snapshot" Markdown file at
`docs/reviews/<DATE>-snapshot.md` (or the closest convention in
this repo). Single commit, `docs(review): addon snapshot before
adversarial review`. This is the baseline you measure against.

---

## Phase 2: Adversarial review (probe checklist)

Run every probe below. Record findings as `OK`, `GAP`, or `FLAG`
(matching SDKP's polish-followup review format) in
`docs/reviews/<DATE>-adversarial-review.md`. Commit as the next
commit on the branch, before any fixes.

### Identity & boundary

- [ ] Addon explicitly states whether it targets the Pumble
      **API-Keys add-on** (static `ApiKey` header) or the **Pumble
      apps platform** (OAuth install flow). The two surfaces are
      disjoint; the wrong assumption breaks at signup.
- [ ] If it's a Pumble app: addon never hardcodes the Pumble API
      base URL. URLs come from JWT claims at install time and from
      the install record at runtime. Confirm by grepping for
      hardcoded `pumble.com`, `cake.com`, `addons.marketplace.cake.com`.
- [ ] If it's a Pumble app: `X-Addon-Token` header is used for
      Pumble-bound calls; never `Authorization`. Confirm via grep.
- [ ] Install record (workspace + addon token) is stored
      server-side only. Never in frontend code, frontend bundle,
      logs, or test fixtures. Confirm by greping the bundle output
      for any token-shaped string.

### Webhook signature verification (if the addon receives Pumble webhooks)

- [ ] Signature verification runs on a **raw body** (not a JSON-parsed
      body). Pumble signs `${timestamp}:${rawBody}`; the verifier
      must see the bytes that came over the wire.
- [ ] `x-pumble-request-timestamp` is checked for staleness
      (typical bound: ±5 minutes). Replay protection.
- [ ] HMAC comparison is **constant-time** (e.g. Node's
      `crypto.timingSafeEqual`). A `===` comparison is a finding.
- [ ] Body size cap (e.g. 1 MiB) is enforced **before** parsing.
      Reject oversized payloads with 413.
- [ ] Malformed JSON returns 400, not 500.
- [ ] Handler failure returns 500 so Pumble retries, but does NOT
      leak internals to the response body. Internals go to logs
      with the secret redaction described below.
- [ ] Probes exist for: missing signature header, wrong signature,
      stale timestamp, oversized body, malformed JSON, handler throw.
      If not, write them as part of the fix commit.

### Slash commands / shortcuts / events (if applicable)

- [ ] Slash commands and shortcuts call `ctx.ack()` within 3
      seconds of receiving the interaction. Any code path that
      defers work behind a network call before ack is a finding -
      ack first, work asynchronously.
- [ ] Modal submissions do **not** call `ctx.ack()` (Pumble app
      contract: views own their own response semantics).
- [ ] Events do not need ack.
- [ ] Every handler null-checks `getUserClient()` results; that
      function can return `undefined` and the OAuth flow assumes
      the caller handles that.

### Field-name discipline

- [ ] Pumble uses short-form field names on `NEW_MESSAGE` and
      reaction events: `aId` (author id), `cId` (channel id),
      `tx` (text), `mId` (message id), `eph` (is-ephemeral),
      `wId` (workspace id), `ty` (event type discriminator). The
      addon's typed payload definitions must match. Cross-reference
      `sdk/knowledge/upstream/events/index.ts`.

### Secret hygiene

- [ ] No real API keys, signing secrets, OAuth client secrets, or
      user emails in any tracked file. Run `git grep -nE
      'PUMBLE_[A-Z_]+_KEY|signing_secret|client_secret|[a-z0-9]{32,}'`
      and inspect each hit; redact or rotate any that are real.
- [ ] `.env*` files (except `.env.example`) are gitignored AND
      confirmed not committed in history. If a secret was ever
      committed, ROTATE it; do not just delete the file.
- [ ] No live workspace IDs, channel IDs, user IDs, or message IDs
      in tracked fixtures. Replace with synthetic 24-char hex
      values (matches Pumble's id shape) before commit.
- [ ] Logs and error messages redact API keys, tokens, and message
      bodies. Confirm by inspecting the log stream from a smoke
      run.

### Transport contract

- [ ] All outbound HTTP has a finite per-request timeout (typically
      ≤30 s; ≤10 s for read endpoints).
- [ ] Retries: idempotent reads can retry with exponential backoff
      and `Retry-After` honoured; non-idempotent writes
      (`sendMessage`, `editMessage`, `deleteMessage`,
      `dmUser`/`dmGroup`, `createChannel`, `createScheduledMessage`)
      MUST NOT auto-retry on 5xx unless the caller passed an
      explicit idempotency key. This matches ADR-0006 in SDKP.
- [ ] 429 responses respect `Retry-After` (seconds OR HTTP-date).
      Confirm with a probe.
- [ ] No outbound HTTPS that targets `http://` instead of `https://`
      (TLS required).

### Authorization

- [ ] Any inbound request that mutates state checks the install
      token / API key / signature BEFORE doing the work. No
      unauthenticated mutating routes.
- [ ] Cross-workspace data isolation: every database query for
      tenant data includes a `workspaceId` predicate, even on
      single-tenant deployments. A regression here is the highest-
      severity finding category.

### Manifest correctness (if marketplace)

- [ ] Scopes are the minimal set the addon actually needs. Any
      scope that isn't referenced by handler code is over-request.
- [ ] Webhook URL points at an HTTPS endpoint owned by the addon
      (no ngrok URLs, no localhost, no example.com).
- [ ] OAuth redirect URI is consistent with what the install
      handler actually accepts.
- [ ] Event subscriptions list only the events the addon actually
      handles. Subscribing to events you ignore wastes Pumble's
      delivery budget and leaks intent to operators.

### Error model

- [ ] Errors at the API boundary are categorised (network vs
      transport vs validation vs server vs auth). See SDKP's
      `sdk/src/extensions/categorize-error.ts` for the canonical
      shape (`categorizeError`).
- [ ] User-facing errors do not echo Pumble error messages
      verbatim; they're translated into the addon's vocabulary.

### Tests + gates

- [ ] Test suite runs offline (no network, no real Pumble calls)
      and is deterministic.
- [ ] Webhook handlers have probes for: valid signed payload,
      tampered signature, stale timestamp, oversized body,
      malformed JSON, handler throw.
- [ ] If the addon exposes an MCP: snapshot the curated tool list
      and assert no destructive tool name (`delete*`, `archive*`,
      `remove*`) leaks into a read-only profile.
- [ ] CI runs the full gate set on every PR (lint, type, test,
      build, secret scan). The gate must FAIL on each invariant -
      verify by deliberately breaking one and running CI locally
      against a throwaway branch if doubt remains.
- [ ] No `xit`, `xdescribe`, `it.skip`, `test.skip` without a
      linked follow-up issue and a removal date.

### Documentation drift

- [ ] README install/setup transcript actually works against a
      clean machine (run it).
- [ ] Manifest scopes match what README describes.
- [ ] `.env.example` lists every var the runtime reads, with no
      real values.
- [ ] Any "powered by pumble-keys-sdk" or similar reference
      points at the renamed npm package (`pumble-keys-sdk`), not
      the pre-rename `pumble-sdk`.

### Out of scope (flag and stop)

If the addon does any of these, FLAG and stop for user input
before fixing:

- Stores Pumble user emails or message bodies in plain text
  outside the runtime path (logs, analytics, fixtures).
- Calls a third-party LLM with raw Pumble message content without
  redaction.
- Adds new runtime dependencies for trivial behaviour that could be
  inlined.
- Renames an exported runtime API name (breaks downstream callers
  silently).

---

## Phase 3: Fix + flag

For every `GAP`:

1. Write a failing test that demonstrates the bug or pins the
   contract (TDD: red first).
2. Add minimal code to make the test pass (green).
3. Run the addon's verify pipeline; confirm exit 0.
4. Commit. Conventional prefix. Subject ≤72 chars. Body explains
   WHY, references the GAP letter from the review.

For every `FLAG`:

1. Do NOT fix without input.
2. Update the review doc with a one-line "deferred: <reason>".
3. Continue with the next gap.

Stop and ask the user when:

- A fix touches an interface used by a sibling project you can't
  predict.
- A finding requires rotating a real secret you don't own.
- The "final" definition is ambiguous about whether to merge or
  leave PR open for review.

---

## Phase 4: Docs alignment

After all fixes land, sweep the addon's docs:

- README: every install/usage transcript actually works (run it).
- Manifest: every claim matches handler code.
- `.env.example`: every var the runtime reads is present.
- CHANGELOG: a new entry summarising what shipped this branch,
  grouped by Identity / Security / Transport / Docs / etc. (the
  SDKP CHANGELOG is the model).
- Any internal runbook or operations checklist mentions the new
  gates so an operator can run them locally.

One commit per doc cluster. Each cluster commit references the
review's GAP letter or the snapshot baseline.

---

## Phase 5: Final state

Definition of done (in addition to whatever the user wrote into
"What 'final' means here" above):

- The addon's verify pipeline exits 0 from a clean checkout (run
  it; do not claim success based on output you have not seen).
- The adversarial review doc has every GAP closed or FLAGged with
  a reason.
- No real secrets in tracked files; `.env*` properly gitignored;
  any secret that was ever committed is rotated.
- README, manifest, and CHANGELOG reflect the post-fix state.
- PR opened against `main` with title
  `<scope>: adversarial review + finalize`, body containing
  per-phase deliverables and the review file link, and a Test
  Plan checklist that the reviewer can tick off.
- The user has explicitly approved merge (do not merge without
  approval).

---

## Reporting cadence

- After Phase 1 (snapshot commit): post a 3-bullet summary - what
  the addon does, what shape it's in, what surprises were found.
- After Phase 2 (review commit): post the count of OK / GAP / FLAG
  findings and the list of GAP letters you intend to fix.
- After Phase 3: post each commit hash + one-line subject.
- After Phase 4: post the list of doc commits.
- At Final: post the PR URL and the verify pipeline summary.

Keep updates short. Don't narrate internal deliberation. State
results.
