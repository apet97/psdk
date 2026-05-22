#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, "../tests/fixtures");

const checks = [
  ["Pumble API key", /pmb_[A-Za-z0-9_-]{8,}/],
  ["Bearer token", /Bearer\s+[A-Za-z0-9._~+/-]+=*/i],
  ["non-placeholder email", /[A-Za-z0-9._%+-]+@(?!example\.invalid\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  [
    "non-placeholder 24-hex id",
    /\b(?!(?:0{20}|a{20}|b{20}|c{20}|d{20})\d{4}\b)[0-9a-f]{24}\b/i,
  ],
  ["known live workspace text", /alpettest|Firstname Lastname|sdk-livetest-\d+/i],
];

let failures = 0;
for (const fileName of readdirSync(fixtureDir).filter((name) => name.endsWith(".jsonl")).sort()) {
  const path = resolve(fixtureDir, fileName);
  const lines = readFileSync(path, "utf8").split(/\n/);
  for (const [index, line] of lines.entries()) {
    for (const [label, pattern] of checks) {
      if (pattern.test(line)) {
        failures++;
        console.error(`${fileName}:${index + 1}: ${label}`);
      }
      pattern.lastIndex = 0;
    }
  }
}

if (failures > 0) {
  console.error(`fixture scan failed: ${failures} issue(s)`);
  process.exit(1);
}

console.log("fixture scan passed");
