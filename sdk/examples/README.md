# pumble-sdk examples

Small examples for the published `pumble-sdk` package.

## Prerequisites

- Node.js 20 or newer
- npm
- A Pumble API key in `PUMBLE_API_KEY` for live examples

## Setup

1. Copy `.env.template` to `.env`.

   ```bash
   cp .env.template .env
   ```

2. Put your API key in `.env`.

## Running the Examples

Build the parent SDK once, then run an example:

```bash
npm run build
npx tsx send-channel-by-name.ts
```

## Facade Examples

These examples use `createPumbleClient`, which resolves names and emails to exact
IDs before writes:

- `send-channel-by-name.ts` sends to `PUMBLE_CHANNEL` such as `#general`.
- `dm-by-email.ts` sends a DM to `PUMBLE_USER_EMAIL`.
- `search-and-reply.ts` searches recent messages and replies to the first hit.
- `webhook-server.ts` runs an Express webhook receiver.

Facade examples export small helpers for config parsing and injected-client
execution. Importing them is safe in tests; live network calls happen only when
the file is run directly.

## Testing Fixtures Example

`testing-fixtures.ts` runs entirely against in-memory fixture data. It shows how
to configure `createPumbleClient` with `createMockPumbleFetch`, so it does not
need `PUMBLE_API_KEY` or live Pumble access.

From the SDK root:

```bash
npm run test:examples
```

## Reply To Thread

`reply-to-thread.ts` is a live recipe for replying under an existing root
message. It reads credentials and target IDs from the environment:

```bash
export PUMBLE_API_KEY="<pumble-api-key>"
export PUMBLE_CHANNEL_ID="<channel-id>"
export PUMBLE_THREAD_ROOT_ID="<root-message-id>"
export PUMBLE_REPLY_TEXT="Thanks for the context."
npx tsx reply-to-thread.ts
```

The helper functions in the file are import-checked by `npm run test:examples`
without live credentials.

## Curated MCP Preview

`mcp-readonly.md` shows the read-only curated tool flow. `mcp-curated-write.md`
shows the safe write flow: `reply_to_thread_preview` before
`reply_to_thread_confirmed`, and `send_message_preview` before
`send_message_confirmed`.

Examples are intentionally excluded from the published npm tarball; they are
repo-local recipes, not package runtime files.
