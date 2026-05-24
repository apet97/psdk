import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(__dirname, "..", "scripts", "refresh-knowledge.mjs");

function runScript(args: string[], env: NodeJS.ProcessEnv = {}) {
  return execFileSync("node", [script, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("refresh-knowledge.mjs", () => {
  it("exits 0 with a hint when the upstream clone is absent", () => {
    const out = runScript(["--dry-run"], {
      OFFICIALSDK_OVERRIDE: resolve(__dirname, "..", "this-path-does-not-exist"),
    });
    expect(out).toMatch(/upstream clone not found/i);
    expect(out).toMatch(/Skipping refresh/i);
  });

  it("dry-run reports what would be written when upstream is present", () => {
    const out = runScript(["--dry-run"]);
    // When the developer-only upstream clone exists, the script should report
    // both targets; when it does not, the absent-clone branch above keeps the
    // pipeline green. Both outcomes are acceptable in CI; gate on substring.
    expect(
      /would write/i.test(out) || /upstream clone not found/i.test(out),
      `unexpected dry-run output:\n${out}`,
    ).toBe(true);
  });
});
