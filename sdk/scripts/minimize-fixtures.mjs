#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeFixtureEntry } from "./record-replay-common.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, "../tests/fixtures");
const args = process.argv.slice(2);
const files = args.length > 0
  ? args
  : readdirSync(fixtureDir).filter((name) => name.endsWith(".jsonl")).sort();

for (const fileName of files) {
  const path = resolve(fixtureDir, fileName);
  const nextLines = [];
  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    if (line.trim() === "") continue;
    nextLines.push(JSON.stringify(sanitizeFixtureEntry(JSON.parse(line))));
  }
  writeFileSync(path, `${nextLines.join("\n")}\n`);
  console.log(`minimized ${fileName}: ${nextLines.length} entries`);
}
