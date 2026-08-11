import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line import/no-unresolved
import { checkGenConfigConsistency } from "../scripts/gen-config-consistency.mjs";

const SDK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GEN_CONFIG_INVOCATION = "node scripts/gen-config-consistency.mjs";

function tmpSdkRoot(genYaml: string, pkg: Record<string, unknown>) {
  const sdkRoot = mkdtempSync(join(tmpdir(), "gen-cons-"));
  mkdirSync(join(sdkRoot, ".speakeasy"), { recursive: true });
  writeFileSync(join(sdkRoot, ".speakeasy", "gen.yaml"), genYaml);
  writeFileSync(join(sdkRoot, "package.json"), JSON.stringify(pkg));
  return sdkRoot;
}

const BASE_GEN_YAML = `
typescript:
  version: 0.4.0
  additionalScripts:
    build: tsgo
    test: vitest run
  additionalPackageJSON:
    files:
      - src
      - esm
`;

const BASE_PKG = {
  version: "0.4.0",
  scripts: { build: "tsgo", test: "vitest run" },
  files: ["src", "esm"],
};

describe("gen-config consistency", () => {
  it("passes when gen.yaml and package.json agree", () => {
    const sdkRoot = tmpSdkRoot(BASE_GEN_YAML, BASE_PKG);
    expect(checkGenConfigConsistency({ sdkRoot })).toEqual([]);
  });

  it("fails when typescript.version trails package.json#version", () => {
    const sdkRoot = tmpSdkRoot(BASE_GEN_YAML, { ...BASE_PKG, version: "0.5.0" });
    const errors = checkGenConfigConsistency({ sdkRoot });
    expect(errors.some((e) => e.includes("typescript.version"))).toBe(true);
  });

  it("fails when package.json has a script gen.yaml doesn't declare", () => {
    const sdkRoot = tmpSdkRoot(BASE_GEN_YAML, {
      ...BASE_PKG,
      scripts: { ...BASE_PKG.scripts, "test:unit": "vitest run tests/unit" },
    });
    const errors = checkGenConfigConsistency({ sdkRoot });
    expect(errors.some((e) => e.includes("test:unit"))).toBe(true);
  });

  it("fails when gen.yaml declares a script package.json doesn't have", () => {
    const genYaml = BASE_GEN_YAML.replace("test: vitest run", "test: vitest run\n    lint: oxlint");
    const sdkRoot = tmpSdkRoot(genYaml, BASE_PKG);
    const errors = checkGenConfigConsistency({ sdkRoot });
    expect(errors.some((e) => e.includes("lint"))).toBe(true);
  });

  it("fails when a shared script key has different values", () => {
    const sdkRoot = tmpSdkRoot(BASE_GEN_YAML, {
      ...BASE_PKG,
      scripts: { ...BASE_PKG.scripts, build: "tsc" },
    });
    const errors = checkGenConfigConsistency({ sdkRoot });
    expect(errors.some((e) => e.includes("scripts.build"))).toBe(true);
  });

  it("fails when additionalPackageJSON.files and package.json#files disagree", () => {
    const sdkRoot = tmpSdkRoot(BASE_GEN_YAML, { ...BASE_PKG, files: ["src"] });
    const errors = checkGenConfigConsistency({ sdkRoot });
    expect(errors.some((e) => e.includes("files") && e.includes("esm"))).toBe(true);
  });

  it("reports a missing gen.yaml", () => {
    const sdkRoot = mkdtempSync(join(tmpdir(), "gen-cons-missing-"));
    writeFileSync(join(sdkRoot, "package.json"), JSON.stringify(BASE_PKG));
    const errors = checkGenConfigConsistency({ sdkRoot });
    expect(errors.some((e) => /gen\.yaml/.test(e))).toBe(true);
  });

  it("does not false-positive on YAML scalar coercion (e.g. version: 1.0 -> number)", () => {
    // Unquoted YAML scalars parse as their native type: `version: 0.4` is the
    // number 0.4, `build: true` is the boolean `true`. Comparing those
    // against package.json's JSON strings without coercion would false-fail.
    const genYaml = BASE_GEN_YAML.replace("version: 0.4.0", "version: 0.4");
    const sdkRoot = tmpSdkRoot(genYaml, { ...BASE_PKG, version: "0.4" });
    expect(checkGenConfigConsistency({ sdkRoot })).toEqual([]);
  });

  // Regression for the gap the correctness review flagged: nothing else
  // pins that verify:offline still actually invokes this script, or that
  // gen.yaml's mirror of that line hasn't drifted from package.json's real
  // one -- the exact bug class G38 exists to catch, applied to itself.
  it("stays wired into package.json's verify:offline script", () => {
    const pkg = JSON.parse(readFileSync(resolve(SDK_ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["verify:offline"]).toContain(GEN_CONFIG_INVOCATION);
  });

  it("gen.yaml's verify:offline mirror matches package.json's exactly", () => {
    const pkg = JSON.parse(readFileSync(resolve(SDK_ROOT, "package.json"), "utf8"));
    const gen = parseYaml(readFileSync(resolve(SDK_ROOT, ".speakeasy", "gen.yaml"), "utf8"));
    expect(gen.typescript.additionalScripts["verify:offline"]).toBe(
      pkg.scripts["verify:offline"],
    );
  });
});
