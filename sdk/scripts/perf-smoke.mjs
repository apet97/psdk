#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { fixtureNameToPath, keyId, requestSnapshot } from "./record-replay-common.mjs";
import { createRateLimiter } from "../esm/extensions/rate-limiter.js";
import { wrapClient } from "../esm/extensions/telemetry.js";

function bench(name, iterations, fn) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsed = performance.now() - start;
  console.log(`${name}: ${iterations} ops in ${elapsed.toFixed(2)} ms (${(elapsed / iterations).toFixed(4)} ms/op)`);
}

async function benchAsync(name, iterations, fn) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) await fn(i);
  const elapsed = performance.now() - start;
  console.log(`${name}: ${iterations} ops in ${elapsed.toFixed(2)} ms (${(elapsed / iterations).toFixed(4)} ms/op)`);
}

const telemetryClient = wrapClient(
  { async ping(value) { return value; } },
  { writer: { write() {}, async flush() {} } },
);
await benchAsync("telemetry proxy async call", 10_000, (i) => telemetryClient.ping(i));

const limiter = createRateLimiter({ rps: 1_000_000, burst: 10_000 });
const queued = [];
const started = performance.now();
for (let i = 0; i < 5_000; i++) queued.push(limiter.limit(() => i));
await Promise.all(queued);
const drainMs = performance.now() - started;
console.log(`rate limiter burst drain: 5000 ops in ${drainMs.toFixed(2)} ms (${(drainMs / 5000).toFixed(4)} ms/op)`);

const fixturePath = fixtureNameToPath("search-all-live");
const entries = new Map();
for (const line of readFileSync(fixturePath, "utf8").split(/\n/)) {
  if (!line.trim()) continue;
  const entry = JSON.parse(line);
  if (entry.type === "http") entries.set(keyId(entry.key), entry);
}
const sample = [...entries.values()][0];
if (sample) {
  const body = sample.request.body === undefined ? undefined : JSON.stringify(sample.request.body);
  const request = new Request(`https://pumble.example.test${sample.request.path}`, {
    method: sample.request.method,
    headers: { "content-type": "application/json" },
    body,
  });
  const lookups = 5_000;
  const lookupStart = performance.now();
  for (let i = 0; i < lookups; i++) {
    const snapshot = await requestSnapshot(request.clone());
    entries.get(keyId(snapshot.key));
  }
  const lookupMs = performance.now() - lookupStart;
  console.log(`replay fixture lookup: ${lookups} ops in ${lookupMs.toFixed(2)} ms (${(lookupMs / lookups).toFixed(4)} ms/op)`);
}
