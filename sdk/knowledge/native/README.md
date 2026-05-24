# Pumble SDK native knowledge

Curated static knowledge an agent (or human) can read without making a
network call. Everything here describes the **Pumble API-Keys add-on**
surface that this SDK targets — not the OAuth-app surface served by
CAKE.com's official `pumble-sdk`. Upstream-derived material lives under
`sdk/knowledge/upstream/` and is governed by `THIRD_PARTY_NOTICES.md`.

These files ship in the npm tarball under `knowledge/native/` and are
exposed via the curated MCP server as the `pumble://knowledge/{+path}`
resource template (see `sdk/docs/MCP-SAFETY.md`).

## Files

- [`glossary.md`](glossary.md) — terms an agent needs to understand the
  SDK's vocabulary (channel id, branded id, facade, resolver cache,
  live smoke, replay fixture, ...).
- [`api-shape.md`](api-shape.md) — the auth header, base URL, content
  type, operation-name endpoint style, pagination contract, and error
  envelope shape.
- [`error-model.md`](error-model.md) — distilled error taxonomy per
  surface (raw SDK throws, facade returns values, CLI exit codes, MCP
  envelopes, webhook 4xx semantics) with cross-link to the long-form
  [`sdk/docs/ERROR-MODEL.md`](../../docs/ERROR-MODEL.md).

## Style and size budget

Each file is held to **8 KB** so an agent can read every entry in one
hop without burning context budget. Add sections rather than essays;
move long-form prose to `sdk/docs/`. The `knowledge-native` test
enforces the size cap, the required H1, and at least two H2 sections.
