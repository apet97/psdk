# Curated MCP Write Recipe

Curated writes use a two-step preview and confirmation flow.

```json
{
  "tool": "send_message_preview",
  "arguments": {
    "channel": "#general",
    "text": "Deploy finished."
  }
}
```

Copy the returned `data.request`, `data.preview`, and `data.confirmationToken` into:

```json
{
  "tool": "send_message_confirmed",
  "arguments": {
    "request": { "channelId": "<resolved-channel-id>", "channel": "general", "text": "Deploy finished." },
    "preview": { "actionType": "send_message", "targetKind": "channel", "targetId": "<resolved-channel-id>", "targetName": "general", "textExcerpt": "Deploy finished.", "riskLevel": "medium" },
    "confirmationToken": "<token-from-preview>"
  }
}
```

Thread replies work the same way with `reply_to_thread_preview` followed by `reply_to_thread_confirmed`.
