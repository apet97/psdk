#!/usr/bin/env node
// Friendly wrapper around the generated bin/mcp-server.js plus the
// hand-written curated MCP server. Adds:
//
//   --profile curated              workflow-first curated MCP tools (default)
//   --profile readonly|readwrite   pre-set raw --tool whitelists
//   --dry-run                      exposes all tools but intercepts mutating
//                                  HTTP at the network layer via a fetch shim
//   --audit-log <path>             append one JSON line per outbound HTTP call
//                                  to <path> (raw URL/status/duration in live
//                                  modes; request/synthetic bodies in dry-run)
//
// All other flags pass through unchanged. Forwards to the underlying
// bin/mcp-server.js via Node's child_process so flag handling stays
// canonical (we don't try to re-implement transport / auth parsing).
//
// --profile vs --dry-run:
//   * --profile readonly: the agent ONLY SEES read-only tools — mutating
//     tools are not advertised. Safer surface area, but the agent can't
//     practice using them.
//   * --dry-run: the agent sees EVERY tool, can call any of them, but any
//     mutating HTTP request is short-circuited to a synthetic 200 by the
//     dry-run-shim. Useful for evaluating agent behaviour without writes.
//   They're complementary; the wrapper rejects passing both simultaneously.
//
// Regen-safety: this file lives in sdk/bin/ and is wired into
// package.json via gen.yaml `additionalPackageJSON.bin`, so Speakeasy
// keeps it as a `pumble-mcp` npm bin entry across regenerations.

import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  CURATED_TOOLS,
  READONLY_TOOLS,
  READWRITE_TOOLS,
  WrapperUsageError,
  buildMcpInvocation,
  parseWrapperArgs,
} from "./pumble-mcp-args.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GENERATED_MCP = resolve(__dirname, "mcp-server.js");
const CURATED_MCP = resolve(__dirname, "pumble-mcp-curated.js");
const DRY_RUN_SHIM = resolve(__dirname, "dry-run-shim.mjs");
const AUDIT_LOG_SHIM = resolve(__dirname, "audit-log-shim.mjs");

function printHelp() {
  process.stdout.write(`
pumble-mcp — wrapper around the Pumble SDK's MCP server

Usage:
  pumble-mcp [options]

Wrapper-only options:
  --profile curated       Launch workflow-first curated tools via the
                          hand-written MCP server (${CURATED_TOOLS.length} tools) instead of
                          the generated raw endpoint server (default). Exposes:
                          ${CURATED_TOOLS.join(", ")}.
  --profile readonly      Expose only read-only tools (${READONLY_TOOLS.length} tools).
                          Mutating tools are hidden from the agent entirely.
  --profile readwrite     Expose all ${READWRITE_TOOLS.length} generated raw tools.
  --allow-raw-writes      Required with --profile readwrite. Confirms that raw
                          generated mutating tools will be exposed to the MCP host.
  --dry-run               Expose all ${READWRITE_TOOLS.length} tools but intercept
                          mutating HTTP (POST/PUT/PATCH/DELETE) at the fetch
                          layer, returning synthetic 200s. Lets the agent
                          exercise the full tool surface without writes.
                          Mutually exclusive with --profile readonly.
  --audit-log <path>      Required with --profile readwrite. Append one JSON line
                          per outbound fetch to <path>.
                          In --dry-run mode, each entry includes the sanitized
                          request body and the synthesised response. In live
                          modes, each entry includes URL, method, status, and
                          duration in milliseconds. Writes are best-effort
                          (failures log once to stderr).
  -h, --help              Show this help.

All other arguments are forwarded verbatim to the selected MCP server
(see \`pumble-mcp start --help\` for transport/auth/tool flags on the
generated raw server).
If --api-key-auth is omitted, the wrapper reads PUMBLE_API_KEY and then
PUMBLESDK_API_KEY_AUTH from the environment.

Examples:
  PUMBLE_API_KEY=... pumble-mcp start --transport stdio
  PUMBLE_API_KEY=... pumble-mcp start --transport stdio --profile curated
  PUMBLE_API_KEY=... pumble-mcp start --transport stdio --profile readonly
  PUMBLE_API_KEY=... pumble-mcp start --transport stdio --profile readwrite --allow-raw-writes --audit-log ./pumble-mcp-audit.jsonl
  PUMBLE_API_KEY=... pumble-mcp start --transport stdio --dry-run
`);
}

const parsed = parseWrapperArgs(process.argv.slice(2));
if (parsed.help) {
  printHelp();
  process.exit(0);
}

let invocation;
try {
  invocation = buildMcpInvocation({
    argv: process.argv.slice(2),
    env: process.env,
    generatedMcp: GENERATED_MCP,
    curatedMcp: CURATED_MCP,
    dryRunShimUrl: pathToFileURL(DRY_RUN_SHIM).href,
    auditLogShimUrl: pathToFileURL(AUDIT_LOG_SHIM).href,
  });
} catch (e) {
  if (e instanceof WrapperUsageError) {
    console.error(e.message);
    process.exit(e.exitCode);
  }
  throw e;
}

if (invocation.dryRun) {
  console.error(`[pumble-mcp] DRY-RUN: all ${READWRITE_TOOLS.length} tools exposed; mutating HTTP intercepted at the fetch layer.`);
} else if (invocation.effectiveProfile === "curated") {
  console.error(`[pumble-mcp] Profile: curated (${CURATED_TOOLS.length} curated tools).`);
} else if (invocation.effectiveProfile === "readwrite") {
  console.error(`[pumble-mcp] WARNING: raw readwrite profile exposes ${READWRITE_TOOLS.length} generated tools, including destructive edit/delete operations. Audit log: ${invocation.auditLog}`);
} else if (invocation.profile) {
  console.error(`[pumble-mcp] Profile: ${invocation.effectiveProfile} (${invocation.tools.length} tools).`);
}
if (invocation.auditLog) {
  console.error(`[pumble-mcp] Audit log: ${invocation.auditLog}`);
}

// Preload fetch shims via `--import` so they patch `globalThis.fetch`
// before the MCP server imports the SDK (which captures the default
// fetcher at module load). Dry-run mode gets the dry-run-shim (which
// also honours PUMBLE_DRY_RUN_LOG). Non-dry-run mode gets the
// audit-log-shim only when --audit-log was supplied.
const child = spawn("node", invocation.nodeArgs, {
  stdio: "inherit",
  env: invocation.childEnv,
});
child.on("exit", (code, sig) => {
  if (sig) process.kill(process.pid, sig);
  else process.exit(code ?? 0);
});
