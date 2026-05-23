#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goalsDir = resolve(__dirname, "..", "..", ".goals");
const repoRoot = resolve(__dirname, "..", "..");

const VALID_PRIORITY = new Set(["P0", "P1", "P2", "P3"]);
const VALID_STATUS = new Set(["planned", "active", "blocked", "done"]);

function fail(msg) {
  console.error(`goal-check: ${msg}`);
  process.exitCode = 1;
}

const manifestRaw = readFileSync(join(goalsDir, "manifest.yaml"), "utf8");
const manifest = parse(manifestRaw);
if (!manifest?.goals || !Array.isArray(manifest.goals)) {
  fail("manifest.yaml is missing a goals array");
  process.exit(1);
}

const declared = new Set(manifest.goals.map((g) => g.id));
const found = readdirSync(goalsDir).filter((f) => /^G\d{2}-.+\.yaml$/.test(f));

if (found.length !== declared.size) {
  fail(`manifest declares ${declared.size} goals but ${found.length} files exist`);
}

for (const file of found) {
  const path = join(goalsDir, file);
  const raw = readFileSync(path, "utf8");
  let doc;
  try {
    doc = parse(raw);
  } catch (err) {
    fail(`${file}: ${err.message}`);
    continue;
  }
  const must = (cond, msg) => {
    if (!cond) fail(`${file}: ${msg}`);
  };
  must(typeof doc?.id === "string" && /^G\d{2}$/.test(doc.id), "missing/invalid id");
  must(declared.has(doc?.id), `id ${doc?.id} not in manifest`);
  must(typeof doc?.title === "string" && doc.title.length > 0, "missing title");
  must(VALID_PRIORITY.has(doc?.priority), "invalid priority");
  must(VALID_STATUS.has(doc?.status), "invalid status");
  must(Array.isArray(doc?.scope?.allowed) && doc.scope.allowed.length > 0, "scope.allowed required");
  must(Array.isArray(doc?.scope?.forbidden), "scope.forbidden required (may be [])");
  must(Array.isArray(doc?.acceptance) && doc.acceptance.length > 0, "acceptance required");
  must(Array.isArray(doc?.commands) && doc.commands.length > 0, "commands required");
  must(
    Array.isArray(doc?.adversarial_checks) && doc.adversarial_checks.length > 0,
    "adversarial_checks required",
  );
  must(typeof doc?.rollback === "string" && doc.rollback.length > 0, "rollback required");

  if (doc?.status === "done") {
    const testLinks = Array.isArray(doc?.links?.tests) ? doc.links.tests : [];
    must(testLinks.length > 0, "status: done requires at least one entry in links.tests");
    for (const entry of testLinks) {
      if (typeof entry !== "string" || entry.length === 0) {
        fail(`${file}: links.tests entries must be non-empty strings`);
        continue;
      }
      if (!existsSync(resolve(repoRoot, entry))) {
        fail(`${file}: links.tests entry does not exist on disk: ${entry}`);
      }
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log(`goal-check: ${found.length} goals OK`);
