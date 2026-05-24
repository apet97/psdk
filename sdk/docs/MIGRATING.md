# Migrating pumble-keys-sdk

## From `pumble-sdk@0.3.x` (this package's pre-rename name)

`0.3.21` was the last release published as `pumble-sdk`. Starting with
`0.3.22`, the npm name is `pumble-keys-sdk` to clear the namespace
collision with CAKE.com's official `pumble-sdk` (the OAuth-app SDK -
see the product boundary in the README). All exported symbols, types,
options, and behavior are unchanged; only the package coordinate and
the bin names moved.

```bash
# Replace the dependency
npm uninstall pumble-sdk
npm install pumble-keys-sdk
```

Then sweep your imports:

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

If you're not sure whether you're on the pre-rename or post-rename
package, run:

```bash
node -e "console.log(require('./node_modules/pumble-keys-sdk/package.json').name + '@' + require('./node_modules/pumble-keys-sdk/package.json').version)"
```

## 0.3.x To Explicit Export Map

- Replace unsupported wildcard imports with documented public imports.
- Use `pumble-keys-sdk/extensions/index.js` for facade helpers.
- Use `pumble-keys-sdk/extensions/webhooks.js` for webhook verification.
- Use raw SDK imports from `pumble-keys-sdk`, `pumble-keys-sdk/models`, `pumble-keys-sdk/models/operations`, and `pumble-keys-sdk/models/errors`.

## Scheduled Messages

- Prefer `client.scheduled` for facade workflows.
- Use `client.raw.scheduledMessages` only for raw endpoint escape hatches.

## MCP Raw Writes

- Curated MCP remains default.
- Raw readwrite mode now requires `--allow-raw-writes --audit-log <path>`.
