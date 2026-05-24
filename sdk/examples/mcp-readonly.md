# Curated MCP Read-Only Recipe

Start the curated MCP profile and use the task-oriented read tools first:

```bash
PUMBLE_API_KEY=<your-api-key> pumble-keys-mcp start --profile curated
```

Useful read calls:

```json
{ "tool": "whoami", "arguments": {} }
{ "tool": "find_channel", "arguments": { "query": "general" } }
{ "tool": "find_user", "arguments": { "query": "ada@example.com" } }
{ "tool": "list_channels", "arguments": { "limit": 10 } }
{ "tool": "search_messages", "arguments": { "text": "deploy", "limit": 5 } }
{ "tool": "get_channel_context", "arguments": { "channel": "#general", "limit": 10 } }
{ "tool": "get_thread_context", "arguments": { "channel": "#general", "messageId": "<message-id>" } }
```

Normal tool results are shaped as `{ "ok": true, "summary": "...", "ids": {}, "data": {}, "nextActions": [] }`.
