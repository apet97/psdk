import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const releaseWorkflow = readFileSync(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

describe("release workflow parity", () => {
  it("uses Node 24-compatible official actions", () => {
    expect(releaseWorkflow).toContain("actions/checkout@v5");
    expect(releaseWorkflow).toContain("actions/setup-node@v5");
    expect(releaseWorkflow).not.toContain("actions/checkout@v4");
    expect(releaseWorkflow).not.toContain("actions/setup-node@v4");
  });

  it("publishes the vendored source with no Speakeasy dependency", () => {
    // Releases publish exactly the committed tree; no CLI install, no
    // regeneration, no SPEAKEASY_API_KEY.
    expect(releaseWorkflow.toLowerCase()).not.toContain("speakeasy");
    expect(releaseWorkflow).toContain("npm run spec:audit");
    expect(releaseWorkflow).toContain("npm run verify:offline");
  });

  it("fails loudly when the tag disagrees with package.json", () => {
    expect(releaseWorkflow).toContain("Require package.json version to match the git tag");
    expect(releaseWorkflow).toContain("commit the version bump before tagging");
    expect(releaseWorkflow).not.toContain("--allow-same-version");
  });

  it("requires live verification before npm publish", () => {
    expect(releaseWorkflow).toContain("PUMBLE_API_KEY: ${{ secrets.PUMBLE_API_KEY }}");
    expect(releaseWorkflow).toContain("npm run verify:live -- --required");
    expect(releaseWorkflow.indexOf("npm run verify:live -- --required"))
      .toBeLessThan(releaseWorkflow.indexOf("npm publish --provenance"));
  });

  it("publishes with provenance and skips already-published versions", () => {
    expect(releaseWorkflow).toContain("npm publish --provenance --access public");
    expect(releaseWorkflow).toContain("already_published");
  });
});
