# Quickstart

This guide gets you from "never used Pumble's API" to "an MCP server talking
to your workspace, with safe write modes" in about ten minutes.

> If you only want to *read* about what's in the SDK, jump to the main
> [README](../README.md). If something here drifts from reality, the live
> arazzo runner at `scripts/run-arazzo-live.mjs` is the source of truth —
> 26/26 workflows there pass against the real Pumble API.

## 1. Prerequisites

* Node 20 or newer (`node --version`)
* A Pumble workspace where you have **admin** access (so you can mint API keys)
* Optional: Docker, if you'd rather run the MCP server as a container

## 2. Get a Pumble API key

1. Open Pumble in a browser.
2. Click your avatar → **Workspace settings** → **API keys**.
3. **Create new key**. Give it a recognisable name (e.g. `pumble-mcp-laptop`).
4. Copy the key — it starts with `pmb_`. **Pumble shows it only once;** if
   you lose it, mint a new one.

Store the key somewhere your shell can see it. The recommended pattern is a
locked-down file:

```bash
# ~/.config/pumble.env  (or whichever path you like)
export PUMBLE_API_KEY="<pumble-api-key>"
```

Then source it before any session:

```bash
source ~/.config/pumble.env
```

The smoke tests and arazzo runner in this repo expect `PUMBLE_API_KEY`
to be set in the environment when they run.

## 3. Install the SDK

```bash
npm install pumble-sdk
```

ESM-only. Most apps should start with the hand-curated facade:
`import { createPumbleClient } from "pumble-sdk/extensions/index.js"`.
For direct generated access, use `import { PumbleSDK } from "pumble-sdk"`.
For CommonJS callers, use `await import(...)`.

## 4. Quick CLI tour

The SDK package also installs `pumble`, a small one-shot CLI for shell
workflows and manual triage. It reads the same `PUMBLE_API_KEY` environment
variable used by the examples below.

```bash
pumble whoami
pumble channels list
pumble send '#general' "hello from the CLI"
pumble search "deploy" --limit 3
pumble messages '#general' --limit 5 --json
pumble schedule list --channel '#general'
```

Write commands (`send`, `dm`, `channels create`, `status set`, `status clear`,
`schedule cancel`) are quiet on success unless you pass `-v`/`--verbose` or
`--json`.

Use IDs when you already have them, or names/emails for convenience:

```bash
pumble channels create sdk-demo --private -v
pumble dm ada@example.com "can you review this?"
pumble status set :coffee: "Deep work" --expires-at 1893456000000
pumble status clear
```

## 5. Hello world

```typescript
// hello.ts
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const client = createPumbleClient({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

const me = await client.identity.me();
console.log(`I am ${me.name} (${me.email}) — role ${me.role}`);

const channels = await client.channels.list();
console.log(`Workspace has ${channels.length} channels`);
```

Run:

```bash
npx tsx hello.ts
```

Expected output (one line each):

```
I am <Your Name> (<your email>) — role OWNER
Workspace has 12 channels
```

The facade groups common operations under `identity`, `channels`, `users`,
`messages`, and `threads`. It does not hide the generated SDK; use
`client.raw` whenever you need a method that is not curated yet.

## 6. Send a message

```typescript
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const client = createPumbleClient({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

const channels = await client.channels.list();
const general = channels.find((c) => c.channel.name === "general")?.channel;
if (!general) throw new Error("no #general?");

const sent = await client.messages.send({
  channelId: general.id,
  text: "Hello from pumble-sdk 👋",
});
console.log("message id:", sent.id);
```

### Thread context and replies

Use the facade when an app or agent needs the current shape of a thread
without pulling bulky message fields or inventing a summary:

```typescript
const context = await client.threads.getContext({
  channelId: general.id,
  messageId: sent.id,
  replyLimit: 10,
});

console.log(context.root.text);
console.log("participants:", context.participants);
console.log("visible replies:", context.replies.length, "of", context.replyCount);
```

`getContext` returns `{ root, replies, participants, replyCount }`, where
`root` and each reply keep the original text verbatim. To write back to the
same thread, prefer the explicit wrapper:

```typescript
await client.threads.replyToThread({
  channelId: general.id,
  messageId: sent.id,
  text: "Replying in thread.",
});
```

The generated thread methods are still available as `client.threads.reply`
and `client.threads.listReplies` when you need the raw SDK surface.

## 7. Set up the MCP server (Claude Desktop)

The same SDK is also an MCP server, so any tool that speaks MCP (Claude
Desktop, Cursor, Continue, etc.) can drive your Pumble workspace.

Use the `pumble-mcp` wrapper — it adds `--profile readonly|readwrite` and
`--dry-run` flags on top of the generated server.

**`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)**:

```json
{
  "mcpServers": {
    "pumble": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk",
        "--", "pumble-mcp",
        "start",
        "--transport", "stdio",
        "--profile", "readwrite"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

Then restart Claude Desktop. You should see "pumble" in the model's tool
list with 26 tools.

> Don't keep your API key in this file long-term — Claude Desktop reads it
> verbatim on every launch. Source it from a wrapper script instead (see
> the README's "Configuring a read-only MCP profile" section).

### Read-only profile

For agents that should never write to the workspace, swap the entry to
`--profile readonly` — that exposes 11 read-only tools and the model
literally cannot call the mutating ones:

```json
{
  "mcpServers": {
    "pumble-read": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk", "--", "pumble-mcp",
        "start", "--transport", "stdio",
        "--profile", "readonly"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

### Dry-run profile

When you *want* the model to practise calling write tools but don't want
those calls to actually happen, use `--dry-run` instead. All 26 tools are
exposed, but every mutating HTTP request (`POST` / `PUT` / `PATCH` /
`DELETE`) is short-circuited to a synthetic 200-OK response by the fetch
shim:

```json
{
  "mcpServers": {
    "pumble-dry": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk", "--", "pumble-mcp",
        "start", "--transport", "stdio",
        "--dry-run"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

You'll see `[pumble-dry-run] POST /sendMessage → synthesised 200` on
stderr for every intercepted call.

## 8. Same thing with Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pumble": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk", "--", "pumble-mcp",
        "start", "--transport", "stdio"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

## 9. Same thing with Docker

```bash
docker build -t pumble-mcp:latest .
docker run --rm -i -e PUMBLE_API_KEY pumble-mcp:latest \
  start --transport stdio --profile readonly
```

To wire it into Claude Desktop via Docker:

```json
{
  "mcpServers": {
    "pumble": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "PUMBLE_API_KEY",
        "pumble-mcp:latest",
        "start", "--transport", "stdio",
        "--profile", "readonly"
      ]
    }
  }
}
```

## 10. Common patterns

### Preview writes before dispatch

For agent workflows that need a dry-run style confirmation step before a
write, build a local preview and sign that exact preview with your own
per-session secret or salt:

```typescript
import {
  createConfirmationToken,
  createWritePreview,
  verifyConfirmationToken,
} from "pumble-sdk/extensions/index.js";

const preview = createWritePreview({
  type: "send_message",
  targetKind: "channel",
  targetId: general.id,
  targetName: "#general",
  text: "Hello from pumble-sdk",
  riskLevel: "medium",
});

const token = createConfirmationToken(preview, process.env["AGENT_CONFIRMATION_SALT"]!);

// Later, immediately before the write:
if (!verifyConfirmationToken(preview, token, process.env["AGENT_CONFIRMATION_SALT"]!)) {
  throw new Error("write preview changed after confirmation");
}
```

The token is only a local integrity token for your confirmation flow. It is
not a Pumble API credential, is not sent to Pumble, and does not represent a
server-side confirmation record. Store previews wherever your app normally
stores pending work; the SDK does not keep a global preview registry.
Free-form text is collapsed, redacted for common token/password patterns, and
truncated in the preview.

### Pagination

Three endpoints paginate: `listMessages`, `fetchScheduledMessages`,
`searchMessages`. All return a `PageIterator` you can drive with
`for await (... of ...)`:

```typescript
const it = await sdk.messages.listMessages({ channelId, limit: 50 });
for await (const page of it) {
  for (const msg of page.result?.messages ?? []) {
    console.log(msg.id, msg.text);
  }
}
```

For `searchMessages`, the built-in iterator is fine for low-volume
queries but can skip co-second messages on page boundaries. Use the
hand-written `searchAllMessages` helper from `pumble-sdk/extensions/index.js` for
defensive walks:

```typescript
import { searchAllMessages } from "pumble-sdk/extensions/index.js";

for await (const hit of searchAllMessages(sdk, { text: "deploy", limit: 50 })) {
  console.log(hit.timestamp.toISOString(), hit.text);
}
```

See the README's "Pagination patterns" section for the full picture.

### Error handling

Pumble emits two error body shapes. Discriminate with `instanceof`:

```typescript
import { PumbleSDKError, LegacyError, StructuredError }
  from "pumble-sdk/models/errors";

try {
  await sdk.messages.sendMessage({ channelId: "bad", text: "x" });
} catch (e) {
  if (e instanceof LegacyError) console.warn("legacy:", e.data$.error);
  else if (e instanceof StructuredError) console.warn("structured:", e.data$.message);
  else if (e instanceof PumbleSDKError) console.warn("other:", e.statusCode);
  else throw e;
}
```

For agents and queue workers, `categorizeError` gives a stable semantic
bucket without parsing message text:

```typescript
import { categorizeError } from "pumble-sdk/extensions/index.js";

try {
  await sdk.messages.sendMessage({ channelId, text: "hello" });
} catch (e) {
  const categorized = categorizeError(e);
  if (categorized.retryable) {
    console.warn("retry later:", categorized.category, categorized.message);
  }
}
```

Categories are `permission`, `not-found`, `rate-limit`, `validation`,
`transient`, and `unknown`. `withRetries` uses this same classification
by default.

### Find by name/email

The `pumble-sdk/extensions/index.js` barrel ships convenience lookups:

```typescript
import { findChannelByName, findUserByEmail } from "pumble-sdk/extensions/index.js";

const general = await findChannelByName(sdk, "general");
const alice   = await findUserByEmail(sdk, "alice@example.com");
```

Both are case-insensitive by default. They walk the (un-paginated)
listings and match client-side — Pumble has no server-side search by
either field.

### Retry transients

```typescript
import { withRetries } from "pumble-sdk/extensions/index.js";

const result = await withRetries(
  () => sdk.messages.sendMessage({ channelId, text: "..." }),
  { maxAttempts: 5, baseMs: 250 },
);
```

Permanent errors (4xx other than 408/425/429) re-throw immediately;
transient network/5xx errors back off with jitter. When Pumble returns
429 or 503 with `Retry-After`, the wrapper uses that server-provided
delay (capped by `maxDelayMs`) before retrying.

### Cap outbound request rate

Use `createRateLimiter` when an agent or batch job can burst faster
than Pumble's per-user ceiling:

```typescript
import { createRateLimiter, withRetries } from "pumble-sdk/extensions/index.js";

const limiter = createRateLimiter({ rps: 3, burst: 10, maxQueue: 50 });

await withRetries(
  () => limiter.limit(() =>
    sdk.messages.sendMessage({ channelId, text: "..." })
  ),
  { maxAttempts: 5 },
);
```

Put the limiter inside `withRetries`, so each retry attempt acquires its
own token. Create separate limiter instances when reads and writes need
different budgets. Pass `{ signal }` to `limit` when queued work should be
cancelled with the surrounding request.

### Branded IDs

Opt in to compile-time prevention of "passed channelId where messageId
was expected" bugs:

```typescript
import { asChannelId, asMessageId } from "pumble-sdk/extensions/index.js";

const cid = asChannelId(general.id);  // throws if shape isn't 24-hex
const mid = asMessageId(sent.id);

// sdk.messages.fetchMessage expects messageId/channelId as plain string
// but cid and mid are still assignable; the protection is one-way:
// you can't accidentally swap them.
```

### Enable audit logging

Two surfaces, two ways to enable.

**On the MCP wrapper** — flip on `--audit-log <path>` to get one JSON
line per outbound fetch. The format depends on the mode:

```bash
# Live workspace: {ts, method, url, status, durationMs}
pumble-mcp start --transport stdio \
  --audit-log /tmp/pumble-mcp.jsonl

# Read-only profile + audit
pumble-mcp start --transport stdio \
  --profile readonly \
  --audit-log /tmp/pumble-readonly.jsonl

# Dry-run: {ts, method, path, requestBody, syntheticBody}
# requestBody is sanitized before it is written.
PUMBLE_API_KEY=fake pumble-mcp start --transport stdio \
  --dry-run \
  --audit-log /tmp/pumble-dry.jsonl

# Inspect:
tail -f /tmp/pumble-mcp.jsonl | jq -c '{op: .method + " " + (.path // .url), status, durationMs}'
```

The wrapper preloads a tiny `--import` shim into the child Node
process so `globalThis.fetch` is wrapped before the SDK captures its
default fetcher. Audit failures (e.g. disk full) log to stderr once
and never break the SDK call path.

**At the SDK layer** — wrap the client with `wrapClient` so every
logical method call (not just every fetch) lands in the audit and an
optional OpenTelemetry span:

```typescript
import { PumbleSDK } from "pumble-sdk";
import {
  createJsonlAuditWriter,
  createOTelSpanRecorder,
  wrapClient,
} from "pumble-sdk/extensions/index.js";

const sdk = wrapClient(
  new PumbleSDK({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! }),
  {
    recorder: createOTelSpanRecorder(),                       // no-op if @opentelemetry/api isn't installed
    writer:   createJsonlAuditWriter("/tmp/pumble-sdk.jsonl"),
  },
);

// Same API surface — every call now emits a span + audit entry.
await sdk.users.myInfo();
```

`@opentelemetry/api` is an optional peer; install it in your app to
opt in. Without it, the recorder degrades to a no-op so the SDK still
loads cleanly. The audit summary keeps known identifiers
(`channelId`, `messageId`, etc.) and drops bodies/free-form text by
default.

### Replay live-shaped tests without credentials

The repo includes checked-in fixtures for CI and local verification:

```bash
cd sdk
npm run test:arazzo:replay
npm run test:live:replay
npm run test:fixtures:scan
npm run test:pack
```

To refresh the arazzo fixture after an intentional spec or SDK request
shape change:

```bash
source /tmp/pumble-livetest.env
PUMBLE_RECORD=arazzo-26-workflows node scripts/run-arazzo-live.mjs
```

Replay mode never falls through to the live network. If a request shape
changes, the replayer raises `PUMBLE_REPLAY miss` so the fixture drift is
obvious. The recorder sanitizes headers, IDs, emails, names, URLs, and
free-form text before writing fixtures, then minimizes known endpoint responses.
Run `npm run fixtures:minimize` after re-recording and `npm run bench:smoke`
when you want fresh helper-path performance receipts.

### Two-way: receive webhooks

Use `createWebhookHandler` when your app needs signed Pumble callbacks
instead of pull-only SDK calls:

```typescript
import express from "express";
import { createWebhookHandler } from "pumble-sdk/extensions/index.js";

const app = express();
const webhook = createWebhookHandler({
  signingSecret: process.env["PUMBLE_SIGNING_SECRET"]!,
  maxBodyBytes: 1024 * 1024,
  handlers: {
    onNewMessage: async (event) => {
      console.log(event.workspaceId, event.body.cId, event.body.tx);
    },
  },
});

// Keep this route raw. Pumble signs `${timestamp}:${rawBody}`.
app.post("/pumble/webhooks", (req, res) => {
  void webhook(req, res);
});
```

The verified headers are `x-pumble-request-timestamp` and
`x-pumble-request-signature`. Invalid signatures and stale timestamps
return 401; oversized bodies return 413; malformed JSON returns 400;
handler failures return 500 so Pumble can retry. Empty signing secrets are
rejected at construction time. The SDK does not depend on Express at
runtime — the helper accepts plain Node HTTP request/response objects.

## 11. Where to go next

* [README — Pagination patterns](../README.md#pagination-patterns)
* [README — Command-line CLI](../README.md#command-line-cli)
* [README — Configuring a read-only MCP profile](../README.md#configuring-a-read-only-mcp-profile)
* [README — Discriminating the LegacyError / StructuredError union](../README.md#discriminating-the-legacyerror--structurederror-union)
* [README — Receiving Pumble webhooks](../README.md#receiving-pumble-webhooks)
* [README — Observability](../README.md#observability)
* [README — Record/replay fixtures](../README.md#recordreplay-fixtures)
* `scripts/run-arazzo-live.mjs` — runs the full 26-workflow test suite
  against the live API
* `tests/` — vitest mocked + live coverage of the hand-written extensions
