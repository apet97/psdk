# Claude project memory: pumble-keys-sdk

`pumble-keys-sdk` is a TypeScript SDK + curated MCP server for the
Pumble API-Keys add-on. It is not a fork of CAKE.com's official
`pumble-sdk` (the OAuth-apps SDK); we lift typed event/block
definitions from that package under ISC attribution and otherwise
target a disjoint Pumble surface.

## Read AGENTS.md before doing anything substantive

The canonical agent-facing protocol is in
[`AGENTS.md`](AGENTS.md). It covers working directories, the
generated-vs-handwritten boundary, the `.goals/` system, the offline
gate pipeline, the knowledge tree contract, MCP surface conventions,
version-bump rules, forbidden phrases, commit hygiene, and out-of-scope
items. CLAUDE.md is a pointer doc; treat AGENTS.md as the source of
truth and never contradict it.

## Two non-negotiables that bite first

1. **Do not hand-edit generated paths.** The authoritative list is
   `.goals/manifest.yaml#guardrails.generated_paths`; AGENTS.md §3
   enumerates it. The next `speakeasy run` overwrites those paths.
   To change generated behavior, edit `PumbleOpenApi.yaml`,
   `sdk/.speakeasy/gen.yaml`, or
   `sdk/scripts/patch-generated-runtime.mjs`. Handwritten code you
   can edit freely: `sdk/src/extensions/**` and
   `sdk/src/mcp-server/curated/**`.
2. **Run `cd sdk && npm run verify:offline` before any commit.** It
   must exit 0. Never bypass with `--no-verify` or test deletions. If
   a gate fails, fix the root cause.

## Quick links

- [Documentation map](sdk/docs/INDEX.md)
- [Quickstart](sdk/docs/QUICKSTART.md)
- [MCP safety profiles + knowledge surfaces](sdk/docs/MCP-SAFETY.md)
- [Versioning runbook](sdk/docs/VERSIONING.md)
- [Migrating from `pumble-sdk@0.3.x`](sdk/docs/MIGRATING.md)

## Forbidden phrases

These come from `.goals/manifest.yaml#guardrails.forbidden_phrases`
and the docs identity guard fails the suite if any appears in a
markdown file outside `docs/product/sdk-generator-product-boundary.md`:

- `SDK generator platform`
- `Stainless competitor`
- `multi-language generator`
- `production-grade`
- `industrial-strength`
- `world-class`
- `best-in-class`

We are a Pumble-specific SDK; do not market it as anything else.

## Note

CLAUDE.md is the project-memory pointer doc that Claude Code
auto-loads. AGENTS.md is the canonical protocol. If they disagree,
trust AGENTS.md and update CLAUDE.md.
