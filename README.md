# pumble-sdk

TypeScript SDK, CLI, and MCP server for the Pumble API-Keys add-on.

The package source and user docs live in [`sdk/`](sdk/).

## Quick Links

- [SDK README](sdk/README.md)
- [Quickstart](sdk/docs/QUICKSTART.md)
- [Integration usage](sdk/docs/INTEGRATION-USAGE.md)
- [Package split policy](sdk/docs/PACKAGE-SPLIT.md)

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
