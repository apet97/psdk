# Operations checklist

What the SDK gives you, and what your deployment must add.

## Provided by the SDK

- Curated MCP profile by default (`docs/MCP-SAFETY.md`).
- Webhook signature verification with timestamp tolerance.
- Debug/audit-log redaction (auth headers, message text, IDs, emails).
- Release evidence in `docs/verification/`.
- npm provenance attestation on every release.
- `--api-key-stdin` / `--api-key-file` for secret management without command-line history leaks.

## You provide

- **Secret management** — keep `PUMBLE_API_KEY` and `PUMBLE_WEBHOOK_SECRET` out of source control. The CLI accepts `--api-key-stdin`.
- **Audit log retention** — when running curated MCP with `--audit-log`, treat the log as auditable storage; rotate/retain per your policy.
- **Version pinning** — pin `pumble-sdk` to an exact version in production deployments.
- **Rate-limit coordination** — multiple processes share Pumble rate limits; the SDK's `createRateLimiter` is process-local. Coordinate externally (e.g. a shared rate-limit service or job queue) if you fan out.
- **Webhook signature secret rotation** — rotate `PUMBLE_WEBHOOK_SECRET` and re-deploy receivers.
- **CI release gates** — only publish from a release tag (G06).

## Not provided

The SDK is a Pumble API client. Service-level guarantees, identity federation, directory provisioning, support contracts, and hosted control-plane infrastructure belong with the Pumble service, not with this package.
