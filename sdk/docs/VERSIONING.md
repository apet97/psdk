# Versioning

`pumble-keys-sdk` follows semantic versioning **within tiers**. Tiers are defined in `STABILITY.md`.

## What is a breaking change

| Tier | Breaking change |
| --- | --- |
| stable | Removed export, changed return type, narrowed accepted input, changed thrown error class |
| beta | Same as stable, but documented as "may change" - still announced |
| experimental | Anything - change without bump |
| generated raw SDK | Schema-level change in `PumbleOpenApi.yaml` (spec audited and replay-verified on every release) |
| façade receipt shape | Change to `{ ok, value, error }` discriminator |

## Every release

- `package.json` version matches the git tag.
- `CHANGELOG.md` entry with a `## <version>` heading.
- `docs/MIGRATING.md` update if any stable export changed.
- `docs/verification/v<version>.md` (G05).

## Cross-doc consistency gate

A version bump must touch all three sources together. Drift is caught
inside `verify:offline` by `sdk/scripts/version-consistency.mjs`
(G33), which exits non-zero if any of the following diverge:

1. `sdk/package.json#version`
2. The latest `## <version>` heading in the repo `CHANGELOG.md`
3. The filename of `sdk/docs/verification/v<version>.md`

The script tolerates an `Unreleased` section above the latest version
and pre-release suffixes such as `0.4.0-rc.1`. It does not enforce
that the package version is the *latest* heading in the changelog -
the changelog keeps history.

Coverage is pinned by `sdk/tests/version-consistency.test.ts`, which
exercises agreement, package-ahead-of-CHANGELOG, missing-verification-doc,
unreleased-tolerance, missing-CHANGELOG, and pre-release suffix cases
against tmp-dir fakes.

## Where the bump touches

When you cut version `X.Y.Z`:

```bash
# 1. Bump package.json
npm version --no-git-tag-version X.Y.Z

# 2. Add a new CHANGELOG section
#    ## X.Y.Z
#    ### Changed / Added / Fixed / Migration notes / ...

# 3. Generate the verification evidence doc
node scripts/write-release-evidence.mjs X.Y.Z

# 4. Confirm the gate passes
node scripts/version-consistency.mjs
npm run verify:offline
```
