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

These links point to repository docs under `sdk/`; the npm package includes the
SDK docs listed by `sdk/package.json`.

- [SDK README](sdk/README.md)
- [Quickstart](sdk/docs/QUICKSTART.md)
- [Integration usage](sdk/docs/INTEGRATION-USAGE.md)
- [Repository examples](sdk/examples/README.md)
- [API reference](sdk/docs/API-REFERENCE.md)
- [Support](sdk/docs/SUPPORT.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Package split policy](sdk/docs/PACKAGE-SPLIT.md)
- [SDK generator boundary](docs/product/sdk-generator-product-boundary.md)

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
