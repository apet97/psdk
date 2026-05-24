#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GOALS_DIR = resolve(__dirname, "..", "..", ".goals");
const DEFAULT_REPO_ROOT = resolve(__dirname, "..", "..");

export const VALID_PRIORITY = new Set(["P0", "P1", "P2", "P3"]);
export const VALID_STATUS = new Set(["planned", "active", "blocked", "done"]);

export function checkGoals({
  goalsDir = DEFAULT_GOALS_DIR,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) {
  const errors = [];
  const push = (msg) => errors.push(msg);

  const manifestPath = join(goalsDir, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    return { errors: [`missing ${manifestPath}`], goalCount: 0 };
  }

  let manifest;
  try {
    manifest = parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    return { errors: [`manifest.yaml: ${err.message}`], goalCount: 0 };
  }
  if (!manifest?.goals || !Array.isArray(manifest.goals)) {
    return {
      errors: ["manifest.yaml is missing a goals array"],
      goalCount: 0,
    };
  }

  const declared = new Set(manifest.goals.map((g) => g.id));
  const found = readdirSync(goalsDir).filter((f) =>
    /^G\d{2}-.+\.yaml$/.test(f),
  );

  if (found.length !== declared.size) {
    push(
      `manifest declares ${declared.size} goals but ${found.length} files exist`,
    );
  }

  for (const file of found) {
    const path = join(goalsDir, file);
    const raw = readFileSync(path, "utf8");
    let doc;
    try {
      doc = parse(raw);
    } catch (err) {
      push(`${file}: ${err.message}`);
      continue;
    }
    const must = (cond, msg) => {
      if (!cond) push(`${file}: ${msg}`);
    };
    must(
      typeof doc?.id === "string" && /^G\d{2}$/.test(doc.id),
      "missing/invalid id",
    );
    must(declared.has(doc?.id), `id ${doc?.id} not in manifest`);
    must(
      typeof doc?.title === "string" && doc.title.length > 0,
      "missing title",
    );
    must(VALID_PRIORITY.has(doc?.priority), "invalid priority");
    must(VALID_STATUS.has(doc?.status), "invalid status");
    must(
      Array.isArray(doc?.scope?.allowed) && doc.scope.allowed.length > 0,
      "scope.allowed required",
    );
    must(
      Array.isArray(doc?.scope?.forbidden),
      "scope.forbidden required (may be [])",
    );
    must(
      Array.isArray(doc?.acceptance) && doc.acceptance.length > 0,
      "acceptance required",
    );
    must(
      Array.isArray(doc?.commands) && doc.commands.length > 0,
      "commands required",
    );
    must(
      Array.isArray(doc?.adversarial_checks) &&
        doc.adversarial_checks.length > 0,
      "adversarial_checks required",
    );
    must(
      typeof doc?.rollback === "string" && doc.rollback.length > 0,
      "rollback required",
    );

    if (doc?.status === "done") {
      const testLinks = Array.isArray(doc?.links?.tests)
        ? doc.links.tests
        : [];
      must(
        testLinks.length > 0,
        "status: done requires at least one entry in links.tests",
      );
      for (const entry of testLinks) {
        if (typeof entry !== "string" || entry.length === 0) {
          push(`${file}: links.tests entries must be non-empty strings`);
          continue;
        }
        if (!existsSync(resolve(repoRoot, entry))) {
          push(
            `${file}: links.tests entry does not exist on disk: ${entry}`,
          );
        }
      }
    }
  }

  return { errors, goalCount: found.length };
}

const invoked =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const { errors, goalCount } = checkGoals();
  if (errors.length > 0) {
    for (const e of errors) console.error(`goal-check: ${e}`);
    process.exit(1);
  }
  console.log(`goal-check: ${goalCount} goals OK`);
}
