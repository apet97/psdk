#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  defaultFixtureDir,
  scanFixtureFile,
} from "./replay-fixtures.mjs";

// Scan both .jsonl replay fixtures and hand-authored .json fixtures
// (e.g. mcp-agent-safety.json) for secrets/PII. The shared
// listFixtureFiles() stays .jsonl-only because the replay loader
// treats every file it returns as JSONL.
const fixtureFiles = readdirSync(defaultFixtureDir)
  .filter((name) => name.endsWith(".jsonl") || name.endsWith(".json"))
  .sort();

let failures = 0;
for (const fileName of fixtureFiles) {
  const path = resolve(defaultFixtureDir, fileName);
  for (const issue of scanFixtureFile(path, fileName)) {
    failures++;
    console.error(`${issue.fileName}:${issue.lineNumber}: ${issue.label}`);
  }
}

if (failures > 0) {
  console.error(`fixture scan failed: ${failures} issue(s)`);
  process.exit(1);
}

console.log("fixture scan passed");
