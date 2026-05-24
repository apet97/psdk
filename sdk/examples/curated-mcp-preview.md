# Curated MCP Preview

Use this recipe when an MCP host may write to Pumble, but every message write
must be previewed before dispatch.

Start the curated profile:

```bash
PUMBLE_API_KEY=<your-api-key> npx -y --package pumble-keys-sdk -- pumble-keys-mcp start \
  --transport stdio \
  --profile curated
```

For thread context, read the compact resource first:

```text
pumble://thread/{channelId}/{messageId}
```

For a thread reply, use the two-step write flow:

1. Call `reply_to_thread_preview` with `channelId`, `messageId`, and `text`.
2. Show the returned `{ request, preview, confirmationToken }` to the user.
3. Only after explicit approval, call `reply_to_thread_confirmed` with the
   unchanged payload.

For a channel message, use `send_message_preview` followed by
`send_message_confirmed` in the same way.

The confirmation token is process-local integrity data for the preview. It is
not a Pumble credential and is not a server-side approval record.

The examples directory is intentionally excluded from the npm tarball; copy the
recipe you need into your app instead of importing it from the published
package.
