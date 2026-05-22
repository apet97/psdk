# pumble-sdk

Developer-friendly & type-safe TypeScript SDK plus bundled MCP server for the
Pumble API-Keys add-on.

[![License: MIT](https://img.shields.io/badge/LICENSE_//_MIT-3b5bdb?style=for-the-badge&labelColor=eff6ff)](https://opensource.org/licenses/MIT)

<!-- Start Summary [summary] -->
## Summary

Pumble API Addon documentation: Strongly-typed OpenAPI contract for the Pumble API-Keys add-on
(https://pumble.com/api). All response and request schemas in this
document were validated against the live API on 2026-05-21 against a
sacrificial workspace; field names, casing, and nullability reflect actual
server behavior.

## Authentication
All endpoints expect the workspace API key in the `ApiKey` request header.
Keys are issued from the Pumble web app at *Workspace settings → API keys*.

## Errors
The Pumble service emits **two** distinct error body shapes, depending on
which validation layer rejects the request:

1. `{ "error": "<string>" }` — legacy/free-form messages from path
   handlers (most common).
2. `{ "message": "<string>", "localizedMessage": "<string>", "code": <int> }`
   — structured validation errors from the framework layer.

Both are documented under the `Error` schema (a `oneOf` union). Generated
SDKs receive a single union type for typed error handling.
<!-- End Summary [summary] -->

<!-- Start Table of Contents [toc] -->
## Table of Contents
<!-- $toc-max-depth=2 -->
* [pumble-sdk](#pumble-sdk)
  * [Authentication](#authentication)
  * [Errors](#errors)
  * [SDK Installation](#sdk-installation)
  * [Requirements](#requirements)
  * [SDK Example Usage](#sdk-example-usage)
  * [Authentication](#authentication-1)
  * [Available Resources and Operations](#available-resources-and-operations)
  * [Standalone functions](#standalone-functions)
  * [Pagination](#pagination)
  * [Retries](#retries)
  * [Error Handling](#error-handling)
  * [Server Selection](#server-selection)
  * [Custom HTTP Client](#custom-http-client)
  * [Debugging](#debugging)
  * [Command-line CLI](#command-line-cli)
  * [Configuring a read-only MCP profile](#configuring-a-read-only-mcp-profile)
  * [Discriminating the `LegacyError | StructuredError` union](#discriminating-the-legacyerror-structurederror-union)
  * [Pagination patterns](#pagination-patterns)
  * [Rate limiting](#rate-limiting)
  * [Observability](#observability)
  * [Record/replay fixtures](#recordreplay-fixtures)
  * [Receiving Pumble webhooks](#receiving-pumble-webhooks)
* [Development](#development)
  * [Maturity](#maturity)
  * [Contributions](#contributions)

<!-- End Table of Contents [toc] -->

<!-- Start SDK Installation [installation] -->
## SDK Installation

The SDK can be installed with either [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), [bun](https://bun.sh/) or [yarn](https://classic.yarnpkg.com/en/) package managers.

### NPM

```bash
npm add pumble-sdk
```

### PNPM

```bash
pnpm add pumble-sdk
```

### Bun

```bash
bun add pumble-sdk
```

### Yarn

```bash
yarn add pumble-sdk
```

> [!NOTE]
> This package is published as an ES Module (ESM) only. For applications using
> CommonJS, use `await import()` to import and use this package.

### Model Context Protocol (MCP) Server

This SDK is also an installable MCP server for AI applications. The
`pumble-mcp` wrapper defaults to the curated profile, where message writes
require a preview/confirmation step. Use `--profile readonly` when the model
must not see write tools, and `--profile readwrite` only when you intentionally
want the raw generated write surface.

> Node.js v20 or greater is required to run the MCP server from npm.

<details>
<summary>Claude installation steps</summary>

Add the following server definition to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "PumbleSDK": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk",
        "--",
        "pumble-mcp", "start",
        "--transport", "stdio"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

</details>

<details>
<summary>Cursor installation steps</summary>

Create a `.cursor/mcp.json` file in your project root with the following content:

```json
{
  "mcpServers": {
    "PumbleSDK": {
      "command": "npx",
      "args": [
        "-y", "--package", "pumble-sdk",
        "--",
        "pumble-mcp", "start",
        "--transport", "stdio"
      ],
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

</details>

For a full list of server arguments, run:

```sh
npx -y --package pumble-sdk -- pumble-mcp --help
```
<!-- End SDK Installation [installation] -->

<!-- Start Requirements [requirements] -->
## Requirements

The SDK targets ECMAScript 2020+ runtimes with `fetch`, Web Streams, and async
iterable support. It is intended for current Node.js LTS releases, evergreen
browsers, Bun, and Deno.
<!-- End Requirements [requirements] -->

<!-- Start SDK Example Usage [usage] -->
## SDK Example Usage

### Example

```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.listChannels();

  console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->

<!-- Start Authentication [security] -->
## Authentication

### Per-Client Security Schemes

This SDK supports the following security scheme globally:

| Name         | Type   | Scheme  | Environment Variable     |
| ------------ | ------ | ------- | ------------------------ |
| `apiKeyAuth` | apiKey | API key | `PUMBLESDK_API_KEY_AUTH` |

To authenticate with the API the `apiKeyAuth` parameter must be set when initializing the SDK client instance. For example:
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.listChannels();

  console.log(result);
}

run();

```
<!-- End Authentication [security] -->

<!-- Start Available Resources and Operations [operations] -->
## Available Resources and Operations

<details open>
<summary>Available methods</summary>

### Channels

* `listChannels` - List all channels
* `getChannel` - Get channel details by ID or name
* `createChannel` - Create a new channel
* `addUsersToChannel` - Add users to a channel
* `removeUserFromChannel` - Remove a user from a channel

### Messages

* `sendMessage` - Send a message to a channel
* `sendReply` - Reply to a message in a channel (thread)
* `dmUser` - Send a direct message to a user
* `dmGroup` - Send a direct message to a group of users
* `fetchMessage` - Fetch a single message by ID
* `fetchThreadReplies` - Fetch the replies of a thread
* `searchMessages` - Search messages
* `deleteMessage` - Delete a message by ID
* `listMessages` - List messages in a channel
* `addReaction` - Add a reaction (emoji) to a message
* `removeReaction` - Remove a reaction from a message
* `editMessage` - Edit a message

### ScheduledMessages

* `createScheduledMessage` - Create a scheduled (future) message
* `fetchScheduledMessages` - Fetch a list of scheduled messages
* `fetchScheduledMessage` - Fetch a single scheduled message by ID
* `editScheduledMessage` - Edit a scheduled message
* `deleteScheduledMessage` - Delete a scheduled message

### Users

* `listUsers` - List all workspace users
* `listUserGroups` - List workspace user groups
* `myInfo` - Get info about the authenticated user
* `customStatus` - Update the custom status of the authenticated user

</details>
<!-- End Available Resources and Operations [operations] -->

<!-- Start Standalone functions [standalone-funcs] -->
## Standalone functions

All the methods listed above are available as standalone functions. These
functions are ideal for use in applications running in the browser, serverless
runtimes or other environments where application bundle size is a primary
concern. When using a bundler to build your application, all unused
functionality will be either excluded from the final bundle or tree-shaken away.

Import standalone functions from `pumble-sdk/funcs/<operation>.js` when you
need a tree-shakable function surface instead of the class client.

<details>

<summary>Available standalone functions</summary>

- `channelsAddUsersToChannel` - Add users to a channel
- `channelsCreateChannel` - Create a new channel
- `channelsGetChannel` - Get channel details by ID or name
- `channelsListChannels` - List all channels
- `channelsRemoveUserFromChannel` - Remove a user from a channel
- `messagesAddReaction` - Add a reaction (emoji) to a message
- `messagesDeleteMessage` - Delete a message by ID
- `messagesDmGroup` - Send a direct message to a group of users
- `messagesDmUser` - Send a direct message to a user
- `messagesEditMessage` - Edit a message
- `messagesFetchMessage` - Fetch a single message by ID
- `messagesFetchThreadReplies` - Fetch the replies of a thread
- `messagesListMessages` - List messages in a channel
- `messagesRemoveReaction` - Remove a reaction from a message
- `messagesSearchMessages` - Search messages
- `messagesSendMessage` - Send a message to a channel
- `messagesSendReply` - Reply to a message in a channel (thread)
- `scheduledMessagesCreateScheduledMessage` - Create a scheduled (future) message
- `scheduledMessagesDeleteScheduledMessage` - Delete a scheduled message
- `scheduledMessagesEditScheduledMessage` - Edit a scheduled message
- `scheduledMessagesFetchScheduledMessage` - Fetch a single scheduled message by ID
- `scheduledMessagesFetchScheduledMessages` - Fetch a list of scheduled messages
- `usersCustomStatus` - Update the custom status of the authenticated user
- `usersListUserGroups` - List workspace user groups
- `usersListUsers` - List all workspace users
- `usersMyInfo` - Get info about the authenticated user

</details>
<!-- End Standalone functions [standalone-funcs] -->

<!-- Start Pagination [pagination] -->
## Pagination

Some of the endpoints in this SDK support pagination. To use pagination, you
make your SDK calls as usual, but the returned response object will also be an
async iterable that can be consumed using the [`for await...of`][for-await-of]
syntax.

[for-await-of]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of

Here's an example of one such pagination call:

```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.fetchThreadReplies({
    rootMessageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
    cursor: "bbbbbbbbbbbbbbbbbbbb0001",
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();

```
<!-- End Pagination [pagination] -->

<!-- Start Retries [retries] -->
## Retries

Some of the endpoints in this SDK support retries.  If you use the SDK without any configuration, it will fall back to the default retry strategy provided by the API.  However, the default retry strategy can be overridden on a per-operation basis, or across the entire SDK.

To change the default retry strategy for a single API call, simply provide a retryConfig object to the call:
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.listChannels({
    retries: {
      strategy: "backoff",
      backoff: {
        initialInterval: 1,
        maxInterval: 50,
        exponent: 1.1,
        maxElapsedTime: 100,
      },
      retryConnectionErrors: false,
    },
  });

  console.log(result);
}

run();

```

If you'd like to override the default retry strategy for all operations that support retries, you can provide a retryConfig at SDK initialization:
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  retryConfig: {
    strategy: "backoff",
    backoff: {
      initialInterval: 1,
      maxInterval: 50,
      exponent: 1.1,
      maxElapsedTime: 100,
    },
    retryConnectionErrors: false,
  },
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.listChannels();

  console.log(result);
}

run();

```
<!-- End Retries [retries] -->

<!-- Start Error Handling [errors] -->
## Error Handling

[`PumbleSDKError`](./src/models/errors/pumble-sdk-error.ts) is the base class for all HTTP error responses. It has the following properties:

| Property            | Type       | Description                                                                             |
| ------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `error.message`     | `string`   | Error message                                                                           |
| `error.statusCode`  | `number`   | HTTP response status code eg `404`                                                      |
| `error.headers`     | `Headers`  | HTTP response headers                                                                   |
| `error.body`        | `string`   | HTTP body. Can be empty string if no body is returned.                                  |
| `error.rawResponse` | `Response` | Raw HTTP response                                                                       |
| `error.data$`       |            | Optional. Some errors may contain structured data. [See Error Classes](#error-classes). |

### Example
```typescript
import { PumbleSDK } from "pumble-sdk";
import * as errors from "pumble-sdk/models/errors";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  try {
    const result = await pumbleSDK.channels.listChannels();

    console.log(result);
  } catch (error) {
    // The base class for HTTP error responses
    if (error instanceof errors.PumbleSDKError) {
      console.log(error.message);
      console.log(error.statusCode);
      console.log(error.body);
      console.log(error.headers);

      // Depending on the method different errors may be thrown
      if (error instanceof errors.LegacyError) {
        console.log(error.data$.error); // string
      }
    }
  }
}

run();

```

### Error Classes
**Primary errors:**
* [`PumbleSDKError`](./src/models/errors/pumble-sdk-error.ts): The base class for HTTP error responses.
  * [`LegacyError`](./src/models/errors/legacy-error.ts): Free-form error message from the request handler layer. Status code `403`.
  * [`StructuredError`](./src/models/errors/structured-error.ts): Structured validation error from the framework layer. Status code `403`.

<details><summary>Less common errors (6)</summary>

<br />

**Network errors:**
* [`ConnectionError`](./src/models/errors/http-client-errors.ts): HTTP client was unable to make a request to a server.
* [`RequestTimeoutError`](./src/models/errors/http-client-errors.ts): HTTP request timed out due to an AbortSignal signal.
* [`RequestAbortedError`](./src/models/errors/http-client-errors.ts): HTTP request was aborted by the client.
* [`InvalidRequestError`](./src/models/errors/http-client-errors.ts): Any input used to create a request is invalid.
* [`UnexpectedClientError`](./src/models/errors/http-client-errors.ts): Unrecognised or unexpected error.


**Inherit from [`PumbleSDKError`](./src/models/errors/pumble-sdk-error.ts)**:
* [`ResponseValidationError`](./src/models/errors/response-validation-error.ts): Type mismatch between the data returned from the server and the structure expected by the SDK. See `error.rawValue` for the raw value and `error.pretty()` for a nicely formatted multi-line string.

</details>
<!-- End Error Handling [errors] -->

<!-- Start Server Selection [server] -->
## Server Selection

### Override Server URL Per-Client

The default server can be overridden globally by passing a URL to the `serverURL: string` optional parameter when initializing the SDK client instance. For example:
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  serverURL: "https://pumble-api-keys.addons.marketplace.cake.com",
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.listChannels();

  console.log(result);
}

run();

```
<!-- End Server Selection [server] -->

<!-- Start Custom HTTP Client [http-client] -->
## Custom HTTP Client

The TypeScript SDK makes API calls using an `HTTPClient` that wraps the native
[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). This
client is a thin wrapper around `fetch` and provides the ability to attach hooks
around the request lifecycle that can be used to modify the request or handle
errors and response.

The `HTTPClient` constructor takes an optional `fetcher` argument that can be
used to integrate a third-party HTTP client or when writing tests to mock out
the HTTP client and feed in fixtures.

The following example shows how to:
- route requests through a proxy server using [undici](https://www.npmjs.com/package/undici)'s ProxyAgent
- use the `"beforeRequest"` hook to add a custom header and a timeout to requests
- use the `"requestError"` hook to log errors

```typescript
import { PumbleSDK } from "pumble-sdk";
import { ProxyAgent } from "undici";
import { HTTPClient } from "pumble-sdk/lib/http";

const dispatcher = new ProxyAgent("http://proxy.example.com:8080");

const httpClient = new HTTPClient({
  // 'fetcher' takes a function that has the same signature as native 'fetch'.
  fetcher: (input, init) =>
    // 'dispatcher' is specific to undici and not part of the standard Fetch API.
    fetch(input, { ...init, dispatcher } as RequestInit),
});

httpClient.addHook("beforeRequest", (request) => {
  const nextRequest = new Request(request, {
    signal: request.signal || AbortSignal.timeout(5000)
  });

  nextRequest.headers.set("x-custom-header", "custom value");

  return nextRequest;
});

httpClient.addHook("requestError", (error, request) => {
  console.group("Request Error");
  console.log("Reason:", `${error}`);
  console.log("Endpoint:", `${request.method} ${request.url}`);
  console.groupEnd();
});

const sdk = new PumbleSDK({ httpClient: httpClient });
```
<!-- End Custom HTTP Client [http-client] -->

<!-- Start Debugging [debug] -->
## Debugging

You can setup your SDK to emit debug logs for SDK requests and responses.

You can pass a logger that matches `console`'s interface as an SDK option.

> [!WARNING]
> Beware that debug logging will reveal secrets, like API tokens in headers, in log messages printed to a console or files. It's recommended to use this feature only during local development and not in production.

```typescript
import { PumbleSDK } from "pumble-sdk";

const sdk = new PumbleSDK({ debugLogger: console });
```

You can also enable a default debug logger by setting an environment variable `PUMBLESDK_DEBUG` to true.
<!-- End Debugging [debug] -->

<!-- Start custom section [pumble-cli] -->
## Command-line CLI

The package ships a first-class `pumble` binary for one-shot shell use. It
reads `PUMBLE_API_KEY` by default (falling back to `PUMBLESDK_API_KEY_AUTH`);
use `--api-key-auth <key>` or `--base-url <url>` when you need an explicit
override.

```bash
export PUMBLE_API_KEY="<pumble-api-key>"

pumble whoami
pumble channels list
pumble channels create sdk-demo --private -v
pumble send '#general' "deploy finished"
pumble dm ada@example.com "can you review this?"
pumble search "incident" --limit 5
pumble messages '#general' --limit 10 --json
pumble status set :coffee: "Deep work" --expires-at 1893456000000
pumble status clear
pumble schedule list --channel '#general'
pumble schedule cancel dddddddddddddddddddd0001 -v
```

Text output is the default for read commands; pass `--json` on commands that
support it for scripting. Mutating commands are quiet on success unless you
pass `-v`/`--verbose` or `--json`.

Channel arguments accept either a 24-hex channel ID or a `#name`; user
arguments accept either a 24-hex user ID or an email address. Name/email
resolution uses the SDK helpers and performs one `listChannels()` or
`listUsers()` call before the write.
<!-- End custom section [pumble-cli] -->

<!-- Start custom section [mcp-readonly] -->
## Configuring a read-only MCP profile

Use `pumble-mcp` for agent workflows. With no profile flag it starts the
curated profile, where message writes go through preview/confirmation tools.
Use the read-only profile when the host must not expose mutating tools at all:

```bash
pumble-mcp start \
  --transport stdio \
  --profile readonly
```

The read-only profile exposes only read tools and hides mutating operations
such as message sends, replies, deletes, scheduled-message writes, and channel
membership changes.

For confirmed writes, keep the curated profile explicit:

```bash
pumble-mcp start \
  --transport stdio \
  --profile curated
```

Curated message writes are two-step: `preview_send_message` returns a preview
and confirmation token, then `send_message_confirmed` performs the SDK write
with that same payload. Thread replies follow the same pattern with
`preview_reply_to_thread` and `reply_to_thread_confirmed`.

### Claude Desktop / Cursor: keep secrets in a launcher

Keep the API key out of JSON config by sourcing it from a small launcher
script and pointing the MCP client at that script:

```bash
# ~/bin/pumble-mcp-readonly.sh
#!/usr/bin/env bash
set -euo pipefail
exec npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio \
  --profile readonly
```

```json
{
  "mcpServers": {
    "PumbleSDK_ReadOnly": {
      "command": "/Users/you/bin/pumble-mcp-readonly.sh",
      "env": {
        "PUMBLE_API_KEY": "<pumble-api-key>"
      }
    }
  }
}
```

Keep `PUMBLE_API_KEY` in the `env` block (not in `args`) so it stays out
of process listings and crash logs.
<!-- End custom section [mcp-readonly] -->

<!-- Start custom section [error-union] -->
## Discriminating the `LegacyError | StructuredError` union

The Pumble service emits two different error body shapes from two different
validation layers. Both surface as subclasses of `PumbleSDKError`, so an
`instanceof` check is the cleanest discriminator:

```typescript
import { PumbleSDK } from "pumble-sdk";
import {
  PumbleSDKError,
  LegacyError,
  StructuredError,
} from "pumble-sdk/models/errors";

const sdk = new PumbleSDK({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

try {
  await sdk.messages.sendMessage({ channelId: "bad", text: "x" });
} catch (e) {
  if (e instanceof LegacyError) {
    // Free-form message from a path handler — usually 403.
    console.warn("Pumble (legacy):", e.data$.error);
  } else if (e instanceof StructuredError) {
    // Validation error from the framework layer — code/localizedMessage/message.
    console.warn(
      `Pumble (structured): code=${e.data$.code} msg=${e.data$.message}`,
    );
  } else if (e instanceof PumbleSDKError) {
    // Any other transport / parse error from this SDK.
    console.warn("Pumble (other):", e.statusCode, e.message);
  } else {
    throw e;
  }
}
```

For library code that only needs to know *whether* the error came from the
API (vs. a network/transport problem), a type guard keeps callers tidy:

```typescript
import { LegacyError, StructuredError } from "pumble-sdk/models/errors";

export function isPumbleApiError(
  e: unknown,
): e is LegacyError | StructuredError {
  return e instanceof LegacyError || e instanceof StructuredError;
}
```

The smoke test at `/tmp/pumble-livetest.mjs` exercises this discrimination
path — sending to a fake channel produces a `LegacyError` with
`statusCode === 403`.

For agents and retry wrappers that need stable semantics instead of
message-string matching, use `categorizeError`:

```typescript
import { categorizeError } from "pumble-sdk/extensions/index.js";

try {
  await sdk.messages.sendMessage({ channelId, text: "ship it" });
} catch (e) {
  const classified = categorizeError(e);
  if (classified.category === "permission") {
    console.warn("API key or workspace permission problem:", classified.message);
  }
  if (classified.retryable) {
    // Queue for retry, or let withRetries handle it at the call site.
  }
}
```

Categories are `permission`, `not-found`, `rate-limit`, `validation`,
`transient`, and `unknown`. `withRetries` uses the same categorization by
default, while still honoring explicit `isRetryable` overrides.
<!-- End custom section [error-union] -->

<!-- Start custom section [pagination-patterns] -->
## Pagination patterns

Three endpoints in this SDK return a `PageIterator`: `listMessages`,
`fetchScheduledMessages`, and `searchMessages`. They all support the
`for await (const page of iterator)` syntax, with the cursor managed by
the SDK.

### `listMessages` — channel scrollback

```typescript
const it = await sdk.messages.listMessages({
  channelId,
  limit: 50,
});

for await (const page of it) {
  for (const msg of page.result?.messages ?? []) {
    console.log(msg.id, msg.text);
  }
  // break early at any time — the next page is only fetched when needed.
}
```

### `fetchScheduledMessages` — outbox

```typescript
const it = await sdk.scheduledMessages.fetchScheduledMessages({
  channelId,
  limit: 100,
});

for await (const page of it) {
  for (const sched of page.result?.scheduledMessages ?? []) {
    console.log(sched.id, sched.sendAt, sched.text);
  }
}
```

### `searchMessages` — built-in vs. defensive helper

The generated `searchMessages` iterator is fine for low-volume queries,
but Pumble truncates message timestamps to second precision server-side.
When multiple matches share an exact `timestampMilli` and that timestamp
falls on a page boundary, the naive cursor can either drop matches or
loop. For paranoid walks, use the hand-written `searchAllMessages`
helper from `pumble-sdk/extensions/index.js`:

```typescript
import { PumbleSDK } from "pumble-sdk";
import { searchAllMessages } from "pumble-sdk/extensions/index.js";

const sdk = new PumbleSDK({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

for await (const hit of searchAllMessages(sdk, { text: "deploy", limit: 50 })) {
  // Guaranteed: every yielded hit's id is unique within this walk.
  console.log(hit.timestamp.toISOString(), hit.channelId, hit.text);
}
```

What it does:

* dedupes by message `id` across pages (no double-yields);
* advances the cursor by `min(timestampMilli) - 1` rather than the last
  item's timestamp, so the next request never re-fetches the just-seen
  page;
* bails when the server returns the same first-id twice (defensive loop
  guard) or a full page yields zero new ids after dedupe;
* throws on > 10 000 pages walked (catch-all safety cap).

The trade-off: if more than `limit` matches share an identical
truncated-to-seconds timestamp at a page boundary, the helper still
can't recover the dropped messages — narrow the query window with
`afterTs` (or a tighter `text` predicate) for high-volume bursts.
<!-- End custom section [pagination-patterns] -->

<!-- Start custom section [rate-limiting] -->
## Rate limiting

Pumble enforces ~200 requests/minute/user (matching its sibling Plaky
API). The SDK ships two extensions to keep a busy agent inside that
ceiling:

| Extension | Purpose |
|---|---|
| `withRetries` | Retries transient failures with jittered exponential backoff. When the response is a 429 or 503 with a `Retry-After` header (delta-seconds *or* HTTP-date), uses that value as the delay instead — capped at `maxDelayMs`. |
| `createRateLimiter` | In-process token-bucket with optional queue bounds and abortable waits. Wrap individual calls in `limiter.limit(() => ...)` so the bucket gates each attempt. |

### Composition

Put the limiter *inside* `withRetries`, so each retry attempt re-
acquires its own token:

```typescript
import { PumbleSDK } from "pumble-sdk";
import { createRateLimiter, withRetries } from "pumble-sdk/extensions/index.js";

const sdk = new PumbleSDK({ apiKeyAuth: process.env["PUMBLE_API_KEY"]! });

// 3 requests/sec sustained, 10-burst.
const limiter = createRateLimiter({ rps: 3, burst: 10, maxQueue: 50 });

const result = await withRetries(
  () => limiter.limit(() =>
    sdk.messages.sendMessage({ channelId, text: "..." })
  ),
  { maxAttempts: 5 },
);
```

Pass `{ signal }` as the second `limit` argument when queued work should be
cancelled with the caller's request lifecycle.

### Separate buckets per priority

The limiter is a tiny independent object — instantiate two for two
budgets. Useful when bulk-reads shouldn't starve interactive writes:

```typescript
const reads  = createRateLimiter({ rps: 5, burst: 20 });
const writes = createRateLimiter({ rps: 1, burst: 3 });

await reads.limit(()  => sdk.messages.listMessages({ channelId, limit: 100 }));
await writes.limit(() => sdk.messages.sendMessage({ channelId, text: "..." }));
```

### `Retry-After` opt-out

When external orchestration already handles 429s — e.g., a queue
worker that drops jobs into a future window — disable the header
respect so `withRetries` keeps its short exponential schedule:

```typescript
await withRetries(
  () => sdk.messages.sendMessage({ channelId, text: "..." }),
  { respectRetryAfter: false, maxAttempts: 3, baseMs: 250 },
);
```

### Caveats

* The limiter is in-process only. Multi-process budgets need a shared
  store (Redis, etc.) and are out of scope for this SDK.
* The limiter doesn't reach into the SDK's internals — it gates the
  *call site*. If a hand-rolled iterator drives parallel fetches from
  outside `limit(...)`, those bypass the budget.
* The clock used by the limiter is monotonic (`performance.now()` by
  default). System clock drift won't break the refill schedule.
<!-- End custom section [rate-limiting] -->

<!-- Start custom section [observability] -->
## Observability

Two surfaces emit structured telemetry — the SDK call layer (via
`wrapClient` from `pumble-sdk/extensions/index.js`) and the MCP wrapper's
fetch shim. Both are off by default and compose:

| Where | What it captures | How to turn on |
|---|---|---|
| **SDK proxy** (`wrapClient(sdk, { writer, recorder })`) | One span + JSONL line per SDK call: `op`, `durationMs`, `statusCode`, `errorClass`, identifier-only `args` summary. | Construct in your app. |
| **MCP wrapper, live modes** (`--audit-log <path>`) | One JSONL line per outbound HTTP request: `{ts, method, url, status, durationMs}`. | `pumble-mcp ... --audit-log /tmp/pumble.jsonl` |
| **MCP wrapper, dry-run** (`--dry-run --audit-log <path>`) | One JSONL line per intercepted mutation: `{ts, method, path, requestBody, syntheticBody}`. `requestBody` is sanitized before writing. | `pumble-mcp ... --dry-run --audit-log /tmp/dry.jsonl` |

### SDK-level: wrapping a client

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
    recorder: createOTelSpanRecorder({ tracerName: "my-app" }),
    writer: createJsonlAuditWriter("/var/log/pumble-sdk.jsonl"),
  },
);

// Every call is now instrumented — the wrapper proxy is transparent.
await sdk.users.myInfo();
```

* `createOTelSpanRecorder` uses `@opentelemetry/api` when installed (as
  an optional peer); without it, the recorder degrades to a no-op so
  the SDK still loads.
* `createJsonlAuditWriter` appends one event per call to disk on a
  serialised promise chain — writes are fire-and-forget and never
  bubble I/O failures into the SDK call path.
* Identifier fields are surfaced in the audit summary (`channelId`,
  `messageId`, etc.); message bodies and free-form text never land in
  the log.

### MCP wrapper: fetch-level auditing

```bash
# Live workspace + audit
pumble-mcp start --transport stdio \
  --audit-log /tmp/pumble-mcp.jsonl

# Dry-run + audit (each intercepted mutation captures sanitized request + synthetic body)
PUMBLE_API_KEY=fake pumble-mcp start --transport stdio \
  --dry-run \
  --audit-log /tmp/pumble-dry.jsonl

# Tail in another window:
tail -f /tmp/pumble-mcp.jsonl | jq -c '.'
```

The wrapper preloads a tiny `--import` shim into the child Node
process so `globalThis.fetch` is wrapped before the SDK captures its
default fetcher. The shim is mutually compatible with `--dry-run`
(which preloads a different shim that intercepts + synthesises).

### Caveats

* Audit-log mode wraps the global `fetch`. If your runtime already
  monkey-patches `fetch` (e.g. a polyfill in a non-Node environment),
  the order of patching matters — preload the audit shim last.
* Span attributes are minimal by design (`http.status_code`,
  `error.class`). If you need richer context, layer your own OTel
  instrumentation alongside `wrapClient`.
* The OTel peer is optional — `npm install --save @opentelemetry/api`
  in the consumer app to opt in; otherwise the recorder is a no-op.
<!-- End custom section [observability] -->

<!-- Start custom section [record-replay] -->
## Record/replay fixtures

The SDK test runner can replay live HTTP fixtures without a Pumble API key.
This lets PR CI exercise the live-shaped arazzo and search helper paths
without sharing sacrificial workspace credentials.

| Fixture | Purpose | Offline command |
|---|---|---|
| `tests/fixtures/arazzo-26-workflows.jsonl` | Full 26-workflow arazzo runner. | `npm run test:arazzo:replay` |
| `tests/fixtures/search-all-live.jsonl` | Live-only `searchAllMessages` vitest block with synthetic responses. | `npm run test:live:replay` |

Additional local gates:

```bash
npm run test:fixtures:scan   # strict checked-in fixture secret/PII scan
npm run fixtures:minimize    # rewrite fixtures through the endpoint minimizer
npm run test:pack            # build, npm pack, install in a temp app, check exports/bins
npm run bench:smoke          # lightweight helper-path performance receipts
```

Replay matching is strict: `method + path + sha256(structural body)`.
Unknown calls throw a `PUMBLE_REPLAY miss` error instead of falling through
to the live network.

Re-record the arazzo fixture from the sacrificial workspace:

```bash
cd sdk
source /tmp/pumble-livetest.env
PUMBLE_RECORD=arazzo-26-workflows node scripts/run-arazzo-live.mjs
```

The recorder sanitizes API-key headers, IDs, emails, names, URLs, and
free-form text before writing JSONL, then minimizes known endpoint responses
to the fields needed for strict replay. The replay tests and
`npm run test:fixtures:scan` scan fixtures for obvious secrets and PII so
accidental live data does not stick.
<!-- End custom section [record-replay] -->

<!-- Start custom section [webhook-receiver] -->
## Receiving Pumble webhooks

`createWebhookHandler` gives apps a small, framework-neutral receiver for
signed Pumble app callbacks. It reads the raw request body, verifies
Pumble's official headers, rejects stale deliveries older than five
minutes, rejects oversized bodies before parsing, and dispatches typed
handlers.

The signature source of truth is the local Pumble Node SDK:

| Header | Meaning |
|---|---|
| `x-pumble-request-timestamp` | Timestamp used in the signing payload. Seconds or milliseconds are accepted by this SDK helper. |
| `x-pumble-request-signature` | Hex HMAC-SHA256 digest of `${timestamp}:${rawBody}` using the app signing secret. |

Minimal Express mount:

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
    onReactionAdded: async (event) => {
      console.log(event.body.mId, event.body.rc);
    },
  },
});

// Do not put express.json() in front of this route; the raw body is signed.
app.post("/pumble/webhooks", (req, res) => {
  void webhook(req, res);
});
```

The SDK does not add Express as a runtime dependency. The handler accepts
plain Node `(IncomingMessage, ServerResponse)` objects, so the same helper
works behind Express, Fastify's raw request, or `http.createServer`.
The signing secret must be a non-empty string; invalid configuration fails
at construction time instead of silently accepting unsigned assumptions.

Typed handlers are available for `NEW_MESSAGE`, `UPDATED_MESSAGE`,
`REACTION_ADDED`, `CHANNEL_CREATED`, `APP_UNINSTALLED`,
`APP_UNAUTHORIZED`, and `WORKSPACE_USER_JOINED`. Handler failures return
HTTP 500 so Pumble can retry; duplicate deliveries are tolerated by
keeping the receiver stateless.
<!-- End custom section [webhook-receiver] -->

# Development

## Maturity

This SDK is in beta, and there may be breaking changes between versions without a major version update. Therefore, we recommend pinning usage
to a specific package version. This way, you can install the same version each time without breaking changes unless you are intentionally
looking for the latest version.

## Contributions

Most of this SDK is generated programmatically from `PumbleOpenApi.yaml`. Any
manual changes inside the comment-fenced `<!-- Start … -->` / `<!-- End … -->`
regions will be overwritten on the next generation. Hand-written code lives in
`src/extensions/` and `tests/`, which the generator leaves alone — open PRs
against those directories for behaviour fixes, or against the YAML for schema
fixes.
