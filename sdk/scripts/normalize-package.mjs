#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = join(__dirname, "..");

const desired = {
  description: "TypeScript SDK and MCP server for the Pumble API-Keys add-on",
  license: "MIT",
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
    "bin/pumble-mcp.mjs",
    "docs/INTEGRATION-USAGE.md",
    "docs/QUICKSTART.md",
    "docs/llms.txt",
    "esm",
    "src",
  ],
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
}
writeJson(lockPath, lock);
