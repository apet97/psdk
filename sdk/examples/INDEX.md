# Examples

| Example | Path | Safety | Needs env |
| --- | --- | --- | --- |
| List channels | `list-channels.ts` | read-only | `PUMBLE_API_KEY` |
| Send channel by name | `send-channel-by-name.ts` | writes | `PUMBLE_API_KEY` |
| DM by email | `dm-by-email.ts` | writes | `PUMBLE_API_KEY` |
| Reply to thread | `reply-to-thread.ts` | writes | `PUMBLE_API_KEY` |
| Add reaction | `add-reaction.ts` | writes | `PUMBLE_API_KEY` |
| Search and reply | `search-and-reply.ts` | writes | `PUMBLE_API_KEY` |
| Schedule message | `schedule-message.ts` | writes | `PUMBLE_API_KEY` |
| Testing fixtures (replay) | `testing-fixtures.ts` | read-only | none |
| OpenTelemetry | `opentelemetry.ts` | read-only | `PUMBLE_API_KEY`, OTEL endpoint |
| Webhook server (PumbleApp) | `webhook-server.ts` | read-only | `PUMBLE_SIGNING_SECRET` |
| Webhooks — express | `webhooks/express.ts` | read-only | `PUMBLE_SIGNING_SECRET` |
| Webhooks — fastify | `webhooks/fastify.ts` | read-only | `PUMBLE_SIGNING_SECRET` |
| Webhooks — next route | `webhooks/next-route.ts` | read-only | `PUMBLE_SIGNING_SECRET` |
| Webhooks — node http | `webhooks/node-http.ts` | read-only | `PUMBLE_SIGNING_SECRET` |
| Curated MCP read-only walkthrough | `mcp-readonly.md` | read-only | none |
| Curated MCP preview/confirm writes | `curated-mcp-preview.md` | writes | `PUMBLE_API_KEY` |
| Curated MCP write recipe | `mcp-curated-write.md` | writes | `PUMBLE_API_KEY` |

Safety labels:

- **read-only** — no Pumble writes; safe to run repeatedly.
- **writes** — sends/edits/schedules messages; run against a sandbox workspace.
- **deletes** — destructive; run with eyes on the workspace.
- **experimental** — uses surfaces marked experimental in `../docs/STABILITY.md`.
