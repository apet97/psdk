import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const promptsDir = resolve(repoRoot, "docs", "superpowers", "prompts");

// The themed audit prompts borrowed from anon's `prompts/` pattern.
// Each is a standalone, runnable audit on a single concern; the
// `pumble-addon-finalize.md` master prompt indexes them. A future edit
// that drops a themed prompt, or that lets the master prompt forget
// to index a theme, fails this test.

const THEMED_PROMPTS = [
  "stability.md",
  "security.md",
  "code-quality.md",
  "performance.md",
] as const;

const MASTER_PROMPT = "pumble-addon-finalize.md";

describe("superpowers prompts", () => {
  it("master finalize prompt exists", () => {
    expect(existsSync(resolve(promptsDir, MASTER_PROMPT))).toBe(true);
  });

  it.each(THEMED_PROMPTS)("themed prompt %s exists", (name) => {
    expect(existsSync(resolve(promptsDir, name))).toBe(true);
  });

  it.each(THEMED_PROMPTS)("master prompt links %s", (name) => {
    const master = readFileSync(resolve(promptsDir, MASTER_PROMPT), "utf8");
    expect(master).toContain(`[\`${name}\`](${name})`);
  });

  it.each(THEMED_PROMPTS)("themed prompt %s opens with H1 and Prompt section", (name) => {
    const body = readFileSync(resolve(promptsDir, name), "utf8");
    expect(body, `${name} missing H1`).toMatch(/^# .+/);
    expect(body, `${name} missing ## Prompt section`).toContain("## Prompt");
  });

  it.each(THEMED_PROMPTS)("themed prompt %s references SDKP as the canonical patterns repo", (name) => {
    const body = readFileSync(resolve(promptsDir, name), "utf8");
    // Each themed prompt should point future agents at SDKP for the
    // canonical Pumble patterns it audits against.
    expect(body).toContain("/Users/15x/Downloads/WORKING/addons-me/SDKP");
  });
});
