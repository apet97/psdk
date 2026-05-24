import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ciWorkflow = readFileSync(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

describe("CI workflow", () => {
  it("uses Node 24-compatible official actions", () => {
    expect(ciWorkflow).toContain("actions/checkout@v5");
    expect(ciWorkflow).toContain("actions/setup-node@v5");
    expect(ciWorkflow).not.toContain("actions/checkout@v4");
    expect(ciWorkflow).not.toContain("actions/setup-node@v4");
  });

  it("does not fail public CI when Speakeasy regeneration credentials are absent", () => {
    expect(ciWorkflow).toContain("SPEAKEASY_API_KEY: ${{ secrets.SPEAKEASY_API_KEY }}");
    expect(ciWorkflow).toContain("if: env.SPEAKEASY_API_KEY != ''");
    expect(ciWorkflow).toContain("if: env.SPEAKEASY_API_KEY == ''");
    expect(ciWorkflow).toContain("offline verification only");
    expect(ciWorkflow).toContain("release regeneration requires SPEAKEASY_API_KEY");
    expect(ciWorkflow).toContain("node sdk/scripts/patch-generated-runtime.mjs");
  });

  // Borrowed from anon's CI - a tracked .env / tokens.json / *.db file is
  // the most common way a secret accidentally lands in git. Pin both the
  // step's presence and the allowlist semantics so a future edit that
  // narrows the pattern (or drops the step) is caught.
  it("includes a 'Check no secrets are tracked' step that allowlists templates", () => {
    expect(ciWorkflow).toContain("Check no secrets are tracked");
    expect(ciWorkflow).toContain("tokens\\.json");
    expect(ciWorkflow).toContain("\\.pumbleapprc");
    expect(ciWorkflow).toContain("Tracked secret-like file detected");
    // Allowlist contract: .env.example / .template / .sample must stay
    // permitted so docs templates can ship in the repo.
    expect(ciWorkflow).toContain("env_ok='\\.env\\.(example|template|sample)$'");
  });
});
