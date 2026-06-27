import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");
const repoRoot = resolve(sdkRoot, "..");

const vitestConfig = readFileSync(
  resolve(sdkRoot, "vitest.config.ts"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(sdkRoot, "package.json"), "utf8"),
) as { scripts: Record<string, string>; devDependencies: Record<string, string> };
const ciYaml = readFileSync(
  resolve(repoRoot, ".github/workflows/ci.yml"),
  "utf8",
);

// Borrowed (loosely) from anon's vitest coverage gate. This repo measures
// only the handwritten tree because the generated code is exercised at
// the integration/replay level; counting unhit generated branches
// against the gate produces noise that does not reflect handwritten
// quality. These tests pin both the configuration shape and the wire-up
// so a future edit that quietly weakens the gate is caught.

describe("coverage gate", () => {
  it("provides a test:coverage npm script", () => {
    expect(packageJson.scripts["test:coverage"]).toBe("vitest run --coverage");
  });

  it("declares @vitest/coverage-v8 as a devDependency", () => {
    expect(packageJson.devDependencies["@vitest/coverage-v8"]).toBeDefined();
  });

  it("vitest.config.ts uses the v8 provider", () => {
    expect(vitestConfig).toContain('provider: "v8"');
  });

  it("vitest.config.ts gates the handwritten tree only", () => {
    expect(vitestConfig).toContain("src/extensions/**/*.{ts,tsx}");
    expect(vitestConfig).toContain("src/mcp-server/curated/**/*.{ts,tsx}");
  });

  it("vitest.config.ts sets thresholds at the agreed floor", () => {
    // Lock in the current floor. Bump these intentionally; a regression
    // that lowers any of them should be caught here, not in a later PR.
    expect(vitestConfig).toMatch(/lines:\s*80/);
    expect(vitestConfig).toMatch(/branches:\s*75/);
    expect(vitestConfig).toMatch(/functions:\s*80/);
    expect(vitestConfig).toMatch(/statements:\s*80/);
  });

  it("CI workflow runs the coverage gate", () => {
    expect(ciYaml).toContain("Coverage gate (handwritten tree)");
    expect(ciYaml).toContain("npm run test:coverage");
  });
});
