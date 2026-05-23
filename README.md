# pumble-sdk

Pumble TypeScript SDK / Developer Toolkit generated with Speakeasy for the Pumble API-Keys add-on.

Use it when you want a typed raw SDK plus safer Pumble workflows: facade-first channel/user/message helpers, CLI commands, curated MCP tools, webhook verification, redaction, replay/live testing, and release verification.

This package is not a general generator for SDKs. The generated raw SDK comes from `PumbleOpenApi.yaml`; the handwritten layers make Pumble API-key workflows safer and more ergonomic than raw endpoints.

The package source and user docs live in [`sdk/`](sdk/).

## What this is

A **Pumble TypeScript SDK / Developer Toolkit**: one generated raw client from `PumbleOpenApi.yaml`, plus handwritten façade, webhooks, CLI, and curated MCP for Pumble specifically.

## What this is not

- A general SDK generator (use Stainless or Speakeasy for that — see [`docs/product/sdk-generator-product-boundary.md`](docs/product/sdk-generator-product-boundary.md)).
- A multi-language code generator.
- A hosted control plane for arbitrary OpenAPI specs.

## Quick Links

Start with the documentation map: **[sdk/docs/INDEX.md](sdk/docs/INDEX.md)** — it groups every doc by job (Start here, SDK basics, CLI, MCP, Webhooks, Testing, Errors, Releases, Experimental, Internals).

Common entry points:

- [SDK README](sdk/README.md)
- [Quickstart](sdk/docs/QUICKSTART.md) · [API reference](sdk/docs/API-REFERENCE.md) · [CLI reference](sdk/docs/CLI-REFERENCE.md)
- [Error model](sdk/docs/ERROR-MODEL.md) · [MCP safety](sdk/docs/MCP-SAFETY.md) · [Resolvers](sdk/docs/RESOLVERS.md)
- [Retries, timeouts, rate limits](sdk/docs/RETRIES-TIMEOUTS-RATE-LIMITS.md) · [Observability](sdk/docs/OBSERVABILITY.md)
- [Testing taxonomy](sdk/docs/TESTING.md) · [CI gates](sdk/docs/CI-GATES.md) · [Versioning](sdk/docs/VERSIONING.md)
- [Security checklist](sdk/docs/SECURITY-CHECKLIST.md) · [Operations checklist](sdk/docs/OPERATIONS-CHECKLIST.md)
- [Realtime boundary](sdk/docs/REALTIME.md) · [Experimental surfaces](sdk/docs/EXPERIMENTAL.md)
- [Stability](sdk/docs/STABILITY.md) · [Spec contract](sdk/docs/SPEC-CONTRACT.md) · [Patch burndown](sdk/docs/patch-burndown.md)
- [Repository examples](sdk/examples/INDEX.md)
- [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)
- [SDK generator boundary](docs/product/sdk-generator-product-boundary.md)
- Governance: [.goals/ registry](.goals/README.md) — one YAML per goal, validated by `sdk/scripts/goal-check.mjs`.

## Install

```bash
npm install pumble-sdk
```

## Basic Usage

```typescript
import { PumbleSDK } from "pumble-sdk";

const sdk = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLE_API_KEY"]!,
});

const me = await sdk.users.myInfo();
console.log(me.id, me.name);
```

## MCP

```bash
npx -y --package pumble-sdk -- pumble-mcp start \
  --transport stdio \
  --profile readonly
```
