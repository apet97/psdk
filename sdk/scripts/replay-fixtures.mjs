import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureNameToPath, keyId } from "./record-replay-common.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const defaultFixtureDir = resolve(__dirname, "../tests/fixtures");

export const fixtureScanChecks = [
  ["Pumble API key", /pmb_[A-Za-z0-9_-]{8,}/],
  ["Bearer token", /Bearer\s+[A-Za-z0-9._~+/-]+=*/i],
  ["non-placeholder email", /[A-Za-z0-9._%+-]+@(?!example\.invalid\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  [
    "non-placeholder 24-hex id",
    /\b(?!(?:0{20}|a{20}|b{20}|c{20}|d{20})\d{4}\b)[0-9a-f]{24}\b/i,
  ],
  ["known live workspace text", /alpettest|Firstname Lastname|sdk-livetest-\d+/i],
];

export function createFixtureKeyId(key) {
  return keyId(key);
}

export function formatReplayMiss(key) {
  return `PUMBLE_REPLAY miss for ${key.method} ${key.path} bodyHash=${key.bodyHash}`;
}

export function loadReplayFixture(name) {
  const fixturePath = fixtureNameToPath(name);
  const raw = readFileSync(fixturePath, "utf8");
  const entries = new Map();
  const meta = new Map();

  for (const [i, line] of raw.split(/\n/).entries()) {
    if (line.trim() === "") continue;
    const entry = JSON.parse(line);
    if (entry.type === "meta") {
      meta.set(entry.name, entry.value);
      continue;
    }
    if (entry.type !== "http" || !entry.key || !entry.response) {
      throw new Error(`Invalid replay fixture line ${i + 1} in ${fixturePath}`);
    }
    const id = createFixtureKeyId(entry.key);
    const bucket = entries.get(id) ?? [];
    bucket.push(entry);
    entries.set(id, bucket);
  }

  return { fixturePath, entries, meta };
}

export function listFixtureFiles(fixtureDir = defaultFixtureDir) {
  return readdirSync(fixtureDir).filter((name) => name.endsWith(".jsonl")).sort();
}

export function scanFixtureText(fileName, text) {
  const issues = [];
  const lines = text.split(/\n/);
  for (const [index, line] of lines.entries()) {
    for (const [label, pattern] of fixtureScanChecks) {
      if (pattern.test(line)) {
        issues.push({ fileName, lineNumber: index + 1, label });
      }
      pattern.lastIndex = 0;
    }
  }
  return issues;
}

export function scanFixtureFile(path, fileName = path) {
  return scanFixtureText(fileName, readFileSync(path, "utf8"));
}
