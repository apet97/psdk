#!/usr/bin/env node
// Enforce the three-way version contract that G24 documents:
//   sdk/package.json#version
//   the latest "## <version>" heading in CHANGELOG.md
//   docs/verification/v<version>.md filename
// All three must agree. Drift is the typical failure mode when someone bumps
// the package version without regenerating the release evidence.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SDK_ROOT = resolve(__dirname, "..");
const DEFAULT_REPO_ROOT = resolve(DEFAULT_SDK_ROOT, "..");

const VERSION_HEADING = /^##\s+(\d+\.\d+\.\d+(?:[-+][\w.]+)?)\s*$/gm;

export function checkVersionConsistency({
  sdkRoot = DEFAULT_SDK_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) {
  const errors = [];

  const pkgPath = resolve(sdkRoot, "package.json");
  if (!existsSync(pkgPath)) {
    return [`missing ${pkgPath}`];
  }
  const pkgVersion = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  if (typeof pkgVersion !== "string" || pkgVersion.length === 0) {
    return ["package.json#version missing or empty"];
  }

  const changelogPath = resolve(repoRoot, "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    errors.push(`missing ${changelogPath}`);
  } else {
    const changelog = readFileSync(changelogPath, "utf8");
    const headings = [...changelog.matchAll(VERSION_HEADING)].map((m) => m[1]);
    if (!headings.includes(pkgVersion)) {
      errors.push(`CHANGELOG.md is missing '## ${pkgVersion}' heading`);
    }
  }

  const verifPath = resolve(sdkRoot, "docs", "verification", `v${pkgVersion}.md`);
  if (!existsSync(verifPath)) {
    errors.push(`missing verification doc: ${join("docs", "verification", `v${pkgVersion}.md`)}`);
  }

  return errors;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const errors = checkVersionConsistency();
  if (errors.length > 0) {
    console.error(`version-consistency: ${errors.length} error(s)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("version-consistency: ok");
}
