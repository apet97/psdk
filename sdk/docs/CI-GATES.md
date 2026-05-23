# CI gates

| Gate | Runs on | Skips when | Required for release? |
| --- | --- | --- | --- |
| Offline verification | every push / PR | never | yes |
| Speakeasy regeneration | every push / PR with `SPEAKEASY_API_KEY` | secret missing (public PRs) | no — diff against committed sources is the gate |
| Live Arazzo (26 workflows) | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Live search | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Facade live smoke | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Curated MCP live smoke | scheduled + release | `PUMBLE_API_KEY` missing | yes (release only) |
| Release required verification | release workflow only | never (publish refuses to continue) | yes |

## How to read CI status

Public PR runs only execute *Offline verification* and (optionally) *Speakeasy regeneration*. They are **not** equivalent to a release-gate run. The release workflow refuses to publish if any required gate is skipped.

Every CI run prints a Markdown summary block listing which gates ran and which were skipped, so the result on the PR page matches the result of `verify:offline`.
