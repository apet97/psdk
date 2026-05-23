# Realtime & streaming

## State of play

- There is **no stable Pumble streaming endpoint** exposed by the raw SDK. If the spec adds one, the generated SDK will pick it up.
- **MCP SSE is transport** between MCP clients and the curated MCP server. It is **not** a Pumble event stream.
- **Socket Mode is experimental** — see `extensions/app/socket-mode.ts` and `docs/EXPERIMENTAL.md`.

## If you need realtime today

Use the webhook helper. It is signed, replay-safe within tolerance, and supported by the release gates.

## Socket Mode requirements

When (and only when) you opt in:

- Inject a verified WebSocket implementation; the SDK does not bundle one.
- Provide reconnect policy with backoff.
- Provide ping/pong / heartbeat handling.
- Catch and route handler exceptions; no global crash on a single frame.
- Run a live test against the sacrificial workspace before promoting to non-experimental.

## Promise

No SDK release will market streaming as stable until tests + spec support exist.
