# Pumble API-Keys API shape

The SDK targets one HTTP surface. This page is the cheat sheet for it:
where to send, what to send, what comes back, and what an error looks
like. The OpenAPI source of truth is `PumbleOpenApi.yaml` at the repo
root; the generated SDK in `sdk/src/funcs/` is derived from it.

## Transport

- **Base URL:** `https://pumble-api-keys.addons.marketplace.cake.com`
- **Auth header:** `ApiKey: <workspace-key>` on every request.
- **Content type:** `application/json` for request and response
  bodies. There are no multipart endpoints in this surface.
- **TLS:** TLS 1.2 or newer. The SDK relies on the platform's default
  TLS stack; do not pin or override certificates in normal use.
- **User-agent:** Generated SDK requests carry a
  `speakeasy-sdk/typescript ...` user-agent so traffic from this SDK
  can be identified at the edge.

## Endpoints

The API uses an **operation-name URL style**: each operation has a
fixed path like `/sendMessage`, `/listChannels`, `/createChannel`,
`/fetchScheduledMessages`. Verbs are not encoded in the path — the
HTTP method (GET vs POST) tells you whether the operation reads or
writes. The handwritten extensions and the curated MCP wrap these with
ergonomic names (`messages.send`, `channels.list`, ...).

The full list lives in `PumbleOpenApi.yaml` (and is mirrored as docs
under `sdk/docs/models/operations/`).

## Pagination

Endpoints that return collections (messages, scheduled messages,
search) take `cursor` and `limit` query parameters. The response
includes a `nextCursor` field when more data is available; pass it
back as `cursor` to continue. Walk every page with the safe helper
`searchAllMessages` instead of writing your own loop — it handles
same-second timestamp boundaries that ad-hoc loops trip over.

## Error envelope

The API returns one of two error shapes. The SDK normalises both into
`PumbleSDKError` so callers usually do not need to discriminate at the
HTTP layer:

- **Legacy:** `{ "error": "<message>" }` — older endpoints, plain
  string.
- **Structured:** `{ "message": "<message>", "localizedMessage":
  "<i18n>", "code": "<machine-readable>" }` — newer endpoints,
  carries an enum-style `code` you can switch on.

The `categorizeError` helper buckets these into `auth`, `rate-limit`,
`bad-request`, `not-found`, `conflict`, `server`, and `network`. The
facade calls it internally and returns the bucket via
`FacadeResult.error.category` so retry/backoff decisions are stable.

## Rate limits

The API enforces per-key request budgets. The SDK respects
`Retry-After` headers via the built-in retry helper; raw callers
should do the same. Coordinated rate-limiting across processes is the
application's responsibility — the SDK only protects in-process
behavior.
