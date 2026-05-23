# .goals — repo-internal goal registry

This directory holds one YAML file per scoped change to `pumble-sdk`.
It is the operating system for AI-assisted maintenance.

## Schema

Every `Gxx-*.yaml` file has these fields:

- `id` — `G00` … `G25`
- `title` — short name
- `priority` — `P0` | `P1` | `P2` | `P3`
- `status` — `planned` | `active` | `blocked` | `done`
- `scope.allowed` — globs the change may touch
- `scope.forbidden` — globs the change must not touch (usually generated paths)
- `why` — the user-visible reason
- `acceptance` — testable criteria
- `commands` — verification commands
- `adversarial_checks` — questions a reviewer must answer "no" to
- `links.docs` / `links.tests` — paths to docs and tests bound to the goal
- `rollback` — one-line revert plan

## Lifecycle

`planned` → `active` (one in flight at a time per priority) → `done` or `blocked`.
A `blocked` goal must list the blocker in the `why` field.

## Validation

`npm run goals:check` (in `sdk/`) and `tests/goal-registry.test.ts` both run on every commit.
