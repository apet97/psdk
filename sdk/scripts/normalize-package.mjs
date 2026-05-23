#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = join(__dirname, "..");

const publicExports = {
  ".": {
    source: "./src/index.ts",
    types: "./esm/index.d.ts",
    default: "./esm/index.js",
  },
  "./package.json": "./package.json",
  "./core.js": {
    source: "./src/core.ts",
    types: "./esm/core.d.ts",
    default: "./esm/core.js",
  },
  "./types": {
    source: "./src/types/index.ts",
    types: "./esm/types/index.d.ts",
    default: "./esm/types/index.js",
  },
  "./models": {
    source: "./src/models/index.ts",
    types: "./esm/models/index.d.ts",
    default: "./esm/models/index.js",
  },
  "./models/errors": {
    source: "./src/models/errors/index.ts",
    types: "./esm/models/errors/index.d.ts",
    default: "./esm/models/errors/index.js",
  },
  "./models/operations": {
    source: "./src/models/operations/index.ts",
    types: "./esm/models/operations/index.d.ts",
    default: "./esm/models/operations/index.js",
  },
  "./extensions/index.js": {
    source: "./src/extensions/index.ts",
    types: "./esm/extensions/index.d.ts",
    default: "./esm/extensions/index.js",
  },
  "./extensions/webhooks.js": {
    source: "./src/extensions/webhooks.ts",
    types: "./esm/extensions/webhooks.d.ts",
    default: "./esm/extensions/webhooks.js",
  },
  "./extensions/telemetry.js": {
    source: "./src/extensions/telemetry.ts",
    types: "./esm/extensions/telemetry.d.ts",
    default: "./esm/extensions/telemetry.js",
  },
  "./extensions/testing/index.js": {
    source: "./src/extensions/testing/index.ts",
    types: "./esm/extensions/testing/index.d.ts",
    default: "./esm/extensions/testing/index.js",
  },
  "./extensions/app/index.js": {
    source: "./src/extensions/app/index.ts",
    types: "./esm/extensions/app/index.d.ts",
    default: "./esm/extensions/app/index.js",
  },
  "./extensions/app/socket-mode.js": {
    source: "./src/extensions/app/socket-mode.ts",
    types: "./esm/extensions/app/socket-mode.d.ts",
    default: "./esm/extensions/app/socket-mode.js",
  },
  "./lib/http": {
    source: "./src/lib/http.ts",
    types: "./esm/lib/http.d.ts",
    default: "./esm/lib/http.js",
  },
};

const desired = {
  description: "TypeScript SDK and MCP server for the Pumble API-Keys add-on",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/apet97/psdk.git",
    directory: "sdk",
  },
  homepage: "https://github.com/apet97/psdk#readme",
  bugs: { url: "https://github.com/apet97/psdk/issues" },
  keywords: [
    "pumble",
    "sdk",
    "typescript",
    "api-client",
    "mcp",
    "cli",
    "webhooks",
  ],
  engines: { node: ">=20" },
  bin: {
    pumble: "./bin/pumble-cli.mjs",
    "pumble-mcp": "./bin/pumble-mcp.mjs",
  },
  files: [
    "bin/audit-log-shim.mjs",
    "bin/dry-run-shim.mjs",
    "bin/mcp-server.js",
    "bin/pumble-cli.mjs",
    "bin/pumble-mcp-args.mjs",
    "bin/pumble-mcp-curated.js",
    "bin/pumble-mcp.mjs",
    "docs/API-REFERENCE.md",
    "docs/ERRORS.md",
    "docs/INTEGRATION-USAGE.md",
    "docs/MCP-SAFETY.md",
    "docs/PACKAGE-SPLIT.md",
    "docs/QUICKSTART.md",
    "docs/STABILITY.md",
    "docs/SUPPORT.md",
    "docs/MIGRATING.md",
    "docs/verification/v0.3.21.md",
    "esm",
    "src",
  ],
  exports: publicExports,
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const packagePath = join(sdkRoot, "package.json");
const pkg = readJson(packagePath);
Object.assign(pkg, desired);
writeJson(packagePath, pkg);

const lockPath = join(sdkRoot, "package-lock.json");
const lock = readJson(lockPath);
if (lock.packages?.[""]) {
  lock.packages[""].bin = desired.bin;
  lock.packages[""].license = desired.license;
  lock.packages[""].engines = desired.engines;
  lock.packages[""].repository = desired.repository;
}
writeJson(lockPath, lock);
