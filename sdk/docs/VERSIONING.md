# Versioning

`pumble-keys-sdk` follows semantic versioning **within tiers**. Tiers are defined in `STABILITY.md`.

## What is a breaking change

| Tier | Breaking change |
| --- | --- |
| stable | Removed export, changed return type, narrowed accepted input, changed thrown error class |
| beta | Same as stable, but documented as "may change" — still announced |
| experimental | Anything — change without bump |
| generated raw SDK | Schema-level change in `PumbleOpenApi.yaml` (validated on every release) |
| façade receipt shape | Change to `{ ok, value, error }` discriminator |

## Every release

- `package.json` version matches the git tag.
- `CHANGELOG.md` entry.
- `docs/MIGRATING.md` update if any stable export changed.
- `docs/verification/v<version>.md` (G05).

## Cross-doc check

`tests/package-metadata.test.ts` asserts that `package.json#version` equals:

- the latest entry in `CHANGELOG.md`
- the filename of the newest `docs/verification/v*.md`
