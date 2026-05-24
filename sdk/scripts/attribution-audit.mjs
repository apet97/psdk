#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SDK_ROOT, "..");
const UPSTREAM_DIR = resolve(SDK_ROOT, "knowledge", "upstream");
// THIRD_PARTY_NOTICES.md lives inside sdk/ so it ships in the npm tarball
// (ISC requires the permission notice "in all copies"). Listed paths in the
// notices table stay relative to the repo root, since they include the
// "sdk/" prefix.
const NOTICES_PATH = resolve(SDK_ROOT, "THIRD_PARTY_NOTICES.md");

export const REQUIRED_HEADER_MARKERS = [
  "@derived-from CAKE-com/pumble-node-sdk",
  "@upstream-path",
  "@license ISC",
];

export function auditAttribution({
  upstreamDir = UPSTREAM_DIR,
  noticesPath = NOTICES_PATH,
  repoRoot = REPO_ROOT,
} = {}) {
  const errors = [];

  if (!existsSync(noticesPath)) {
    errors.push(`missing notices file: ${relative(repoRoot, noticesPath)}`);
    return errors;
  }

  const noticesText = readFileSync(noticesPath, "utf8");
  const listedPaths = parseListedPaths(noticesText);

  if (!existsSync(upstreamDir)) {
    // No upstream tree yet (pre-G30 state). Notices file may still list nothing.
    // Listed paths that don't exist on disk are still flagged below.
    for (const listed of listedPaths) {
      if (!existsSync(resolve(repoRoot, listed))) {
        errors.push(`${listed}: listed in THIRD_PARTY_NOTICES.md but missing on disk`);
      }
    }
    return errors;
  }

  const onDisk = walkFiles(upstreamDir);
  const onDiskRel = new Set(onDisk.map((abs) => relative(repoRoot, abs)));

  for (const absolute of onDisk) {
    const relPath = relative(repoRoot, absolute);
    const content = readFileSync(absolute, "utf8");
    for (const marker of REQUIRED_HEADER_MARKERS) {
      if (!content.includes(marker)) {
        errors.push(`${relPath}: header missing marker "${marker}"`);
      }
    }
    if (!listedPaths.has(relPath)) {
      errors.push(`${relPath}: not listed in THIRD_PARTY_NOTICES.md`);
    }
  }

  for (const listed of listedPaths) {
    if (!onDiskRel.has(listed) && !existsSync(resolve(repoRoot, listed))) {
      errors.push(`${listed}: listed in THIRD_PARTY_NOTICES.md but missing on disk`);
    }
  }

  return errors;
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const stat = statSync(dir);
  if (!stat.isDirectory()) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function parseListedPaths(noticesText) {
  const set = new Set();
  // Matches markdown table rows whose first column wraps a path in backticks.
  for (const match of noticesText.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)) {
    set.add(match[1].trim());
  }
  return set;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const errors = auditAttribution();
  if (errors.length > 0) {
    console.error(`attribution-audit: ${errors.length} error(s)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("attribution-audit: ok");
}
