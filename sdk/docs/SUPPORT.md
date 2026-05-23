# Support

## Runtime Support

`pumble-sdk` is a server-side Node.js 20+ ESM package. Browser, React Native, Cloudflare Workers, Deno, Bun runtime support, and edge runtime support are not claimed for `0.3.x`.

The package may work in some non-Node runtimes, but releases are verified against Node.js 20+. Do not ship browser secrets; Pumble API keys belong in server-side environments.

Primary supported surfaces are the raw generated SDK, facade helpers, curated
MCP tools, webhook helpers, and CLI.

Experimental surfaces are listed in `docs/STABILITY.md`.

## Future Browser Or Edge Support Requirements

Do not claim browser or edge support until all of these pass:

- Conditional exports for runtime-specific builds.
- Browser-safe dependency audit.
- No secret-bearing examples in frontend code.
- Build and import smoke tests in the chosen runtime.
- Docs for safe server-side proxy usage.

## Support Matrix

| Area | Status |
| --- | --- |
| Node.js 20+ ESM | Supported |
| Raw generated SDK | Stable |
| Facade workflows | Stable |
| Webhook verification | Stable |
| Curated MCP | Stable |
| Telemetry helpers | Beta |
| Testing/replay helpers | Beta |
| App/OAuth helpers | Experimental |
| Socket Mode | Experimental |
| Browser/edge runtime | Not supported in `0.3.x` |

## Release Evidence Checklist

Every release should link or attach:

- OpenAPI spec audit result.
- Generated diff summary.
- Offline verification result.
- Live verification result with redacted output.
- Pack smoke result.
- npm provenance confirmation.
- Changelog entry.
- Known limitations.

## Organization Deployment Notes

For organization deployments:

- Store API keys in server-side secret managers.
- Prefer env/file/stdin secret input for CLI.
- Use curated MCP by default.
- Require `--allow-raw-writes --audit-log <path>` for raw MCP writes.
- Keep audit logs in restricted storage.
- Verify live smoke output is redacted before sharing.
