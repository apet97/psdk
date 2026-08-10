# Migrating pumble-keys-sdk

## First published version: 0.4.0

`pumble-keys-sdk@0.4.0` is the first version of this package published
to npm. There is no earlier published version to migrate from: the
`0.3.x` versions in the CHANGELOG are development history, and none of
them was published — neither under this name nor under the pre-rename
working name `pumble-sdk`. (`pumble-sdk` on npm is CAKE.com's official
OAuth-apps SDK, a different product surface — see the product boundary
in the README.)

If you start on `0.4.0`, there is nothing to migrate. The sections
below apply only if you used this repository from source before the
first publish.

## From a pre-rename source checkout

Before the rename, the source tree used the working name `pumble-sdk`
and the bins `pumble` / `pumble-mcp`. If you consumed the repo
directly (for example with `file:` or `git` dependencies), sweep your
imports:

```diff
- import { PumbleSDK } from "pumble-sdk";
+ import { PumbleSDK } from "pumble-keys-sdk";

- import { createPumbleClient } from "pumble-sdk/extensions/index.js";
+ import { createPumbleClient } from "pumble-keys-sdk/extensions/index.js";

- import { createWebhookHandler } from "pumble-sdk/extensions/webhooks.js";
+ import { createWebhookHandler } from "pumble-keys-sdk/extensions/webhooks.js";
```

CLI bins also moved:

| Old | New |
| --- | --- |
| `pumble` | `pumble-keys` |
| `pumble-mcp` | `pumble-keys-mcp` |

Update any shell aliases, npm scripts, MCP host configs, and CI jobs
that named the old bins. If you ran the curated MCP via `npx`, the
package name in the `--package` flag changes too:

```diff
- npx -y --package pumble-sdk -- pumble-mcp start --transport stdio
+ npx -y --package pumble-keys-sdk -- pumble-keys-mcp start --transport stdio
```

## Explicit export map

- Replace unsupported wildcard imports with documented public imports.
- Use `pumble-keys-sdk/extensions/index.js` for facade helpers.
- Use `pumble-keys-sdk/extensions/webhooks.js` for webhook verification.
- Use raw SDK imports from `pumble-keys-sdk`, `pumble-keys-sdk/models`, `pumble-keys-sdk/models/operations`, and `pumble-keys-sdk/models/errors`.

## Scheduled Messages

- Prefer `client.scheduled` for facade workflows.
- Use `client.raw.scheduledMessages` only for raw endpoint escape hatches.

## MCP Raw Writes

- Curated MCP remains default.
- Raw readwrite mode requires `--allow-raw-writes --audit-log <path>`.
