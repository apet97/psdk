#!/usr/bin/env node
// Enforce agreement between .speakeasy/gen.yaml (what Speakeasy generates
// package.json from) and the real package.json (what npm actually runs).
// The 2026-08-11 regen broke twice on this exact drift: gen.yaml's
// additionalScripts had 17 of package.json's 29 real scripts, and
// typescript.version trailed package.json#version by one release (it feeds
// SDK_METADATA.sdkVersion, which the MCP server reports to clients). See
// sdk/docs/patch-burndown.md's "2026-08-11 regen probe" section for the
// incident. This only compares gen.yaml against package.json -- it does not
// check generated files (e.g. src/lib/config.ts), which only pick up a
// gen.yaml change after a human runs `speakeasy run`.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SDK_ROOT = resolve(__dirname, "..");

function diffSets(label, fromGenYaml, fromPackageJson) {
  const errors = [];
  const missingInPkg = [...fromGenYaml].filter((v) => !fromPackageJson.has(v)).sort();
  const missingInGen = [...fromPackageJson].filter((v) => !fromGenYaml.has(v)).sort();
  if (missingInPkg.length > 0) {
    errors.push(`${label}: in gen.yaml but not package.json: ${missingInPkg.join(", ")}`);
  }
  if (missingInGen.length > 0) {
    errors.push(`${label}: in package.json but not gen.yaml: ${missingInGen.join(", ")}`);
  }
  return errors;
}

export function checkGenConfigConsistency({ sdkRoot = DEFAULT_SDK_ROOT } = {}) {
  const genPath = resolve(sdkRoot, ".speakeasy", "gen.yaml");
  const pkgPath = resolve(sdkRoot, "package.json");
  if (!existsSync(genPath)) return [`missing ${genPath}`];
  if (!existsSync(pkgPath)) return [`missing ${pkgPath}`];

  const gen = parse(readFileSync(genPath, "utf8"));
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const ts = gen?.typescript ?? {};
  const errors = [];

  // String()-coerce every comparison: YAML scalars like `version: 1.0` or an
  // unquoted `true` parse as a number/boolean, not a string, and would
  // otherwise false-positive against package.json's JSON string.
  if (String(ts.version) !== String(pkg.version)) {
    errors.push(
      `typescript.version (${ts.version ?? "<missing>"}) != package.json#version (${pkg.version ?? "<missing>"})`,
    );
  }

  const genScripts = new Set(Object.keys(ts.additionalScripts ?? {}));
  const pkgScripts = new Set(Object.keys(pkg.scripts ?? {}));
  errors.push(...diffSets("additionalScripts", genScripts, pkgScripts));
  for (const key of genScripts) {
    if (!pkgScripts.has(key)) continue;
    const genValue = ts.additionalScripts[key];
    const pkgValue = pkg.scripts[key];
    if (String(genValue) !== String(pkgValue)) {
      errors.push(`scripts.${key}: gen.yaml (${genValue}) != package.json (${pkgValue})`);
    }
  }

  const genFiles = new Set(ts.additionalPackageJSON?.files ?? []);
  const pkgFiles = new Set(pkg.files ?? []);
  errors.push(...diffSets("additionalPackageJSON.files", genFiles, pkgFiles));

  return errors;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const errors = checkGenConfigConsistency();
  if (errors.length > 0) {
    console.error(`gen-config-consistency: ${errors.length} error(s)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("gen-config-consistency: ok");
}
