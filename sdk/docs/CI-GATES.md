# CI gates

| Gate | Runs on | Skips when | Required for release? |
| --- | --- | --- | --- |
| Offline verification | every push / PR | never | yes |
| Live Arazzo (26 workflows) | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Live search | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Facade live smoke | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Curated MCP live smoke | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Release required verification | release workflow only | never (publish refuses to continue) | yes |

## How to read CI status

Public PR runs only execute *Offline verification* and the coverage gate. They are **not** equivalent to a release-gate run. The SDK source is vendored: CI verifies the committed tree; regeneration from `PumbleOpenApi.yaml` is an optional local maintainer task. The release workflow refuses to publish if any required gate is skipped.

Every CI run prints a Markdown summary block listing which gates ran and which were skipped, so the result on the PR page matches the result of `verify:offline`.
