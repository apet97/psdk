#!/usr/bin/env node
// Refresh the upstream-derived knowledge tree under sdk/knowledge/upstream/
// from a local clone of CAKE-com/pumble-node-sdk. The clone is a dev-only
// artifact (the path is gitignored), so this script is a developer convenience
// not a CI gate. It exits 0 even when the upstream is missing so verify:offline
// stays green without forcing a clone everywhere.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SDK_ROOT, "..");

const DEFAULT_UPSTREAM = resolve(REPO_ROOT, "officialsdk", "pumble-node-sdk");
const upstreamOverride = process.env["OFFICIALSDK_OVERRIDE"];
const upstreamRoot = upstreamOverride
  ? resolve(upstreamOverride)
  : DEFAULT_UPSTREAM;

const TARGET_ROOT = resolve(SDK_ROOT, "knowledge", "upstream");
const today = new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes("--dry-run");

const EVENTS_RELATIVE = "pumble-sdk/src/core/types/pumble-events.ts";
const BLOCKS_RELATIVE = "pumble-sdk/src/api/v1/types.ts";

if (!existsSync(upstreamRoot)) {
  console.log(
    [
      `refresh-knowledge: upstream clone not found at ${upstreamRoot}.`,
      "  Clone it once before re-running:",
      "    git clone https://github.com/CAKE-com/pumble-node-sdk \\",
      "      officialsdk/pumble-node-sdk",
      "  (Override with OFFICIALSDK_OVERRIDE=/path for an out-of-tree clone.)",
      "  Skipping refresh; exiting 0 because this script is opt-in.",
    ].join("\n"),
  );
  process.exit(0);
}

const ops = [];

const eventsSource = resolve(upstreamRoot, EVENTS_RELATIVE);
if (!existsSync(eventsSource)) {
  console.error(`refresh-knowledge: missing upstream file ${eventsSource}`);
  process.exit(1);
}
ops.push({
  out: resolve(TARGET_ROOT, "events", "index.ts"),
  body: liftEvents(readFileSync(eventsSource, "utf8")),
});

const blocksSource = resolve(upstreamRoot, BLOCKS_RELATIVE);
if (!existsSync(blocksSource)) {
  console.error(`refresh-knowledge: missing upstream file ${blocksSource}`);
  process.exit(1);
}
ops.push({
  out: resolve(TARGET_ROOT, "blocks", "types.ts"),
  body: liftBlocks(readFileSync(blocksSource, "utf8")),
});

if (dryRun) {
  for (const op of ops) {
    console.log(`would write ${op.out} (${op.body.length} bytes)`);
  }
  process.exit(0);
}

for (const op of ops) {
  mkdirSync(dirname(op.out), { recursive: true });
  writeFileSync(op.out, op.body);
  console.log(`wrote ${op.out}`);
}

function header(upstreamPath) {
  return `/**
 * @derived-from CAKE-com/pumble-node-sdk
 * @upstream-path ${upstreamPath}
 * @license ISC
 * Copyright (c) CAKE.com Inc. and CAKE-com/pumble-node-sdk contributors.
 * See THIRD_PARTY_NOTICES.md.
 *
 * Lifted on ${today} via scripts/refresh-knowledge.mjs.
 * Do not hand-edit; re-run the refresh script instead.
 */
`;
}

function liftEvents(source) {
  return header(EVENTS_RELATIVE) + source;
}

function liftBlocks(source) {
  // Strip lines that introduce runtime values (functions, classes, async
  // initializers, imports of runtime modules). Keep type/interface/namespace
  // declarations so the resulting file is import-safe (no side effects when
  // evaluated by a tool that loads it as TypeScript). This is a coarse filter
  // — the test in tests/knowledge-upstream.test.ts pins the structural shape.
  const lines = source.split("\n");
  const kept = [];
  for (const line of lines) {
    if (/^\s*export (?:default\s+)?(?:async\s+)?function\s/.test(line)) continue;
    if (/^\s*export\s+class\s/.test(line)) continue;
    if (/^\s*class\s/.test(line)) continue;
    if (/^\s*import\s+/.test(line)) continue;
    kept.push(line);
  }
  return header(BLOCKS_RELATIVE) + kept.join("\n");
}
