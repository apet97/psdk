import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, expect, it } from "vitest";

const scrubbedEnv = () => {
  const env = { ...process.env };
  delete env.PUMBLE_API_KEY;
  return env;
};

describe("verify-live script", () => {
  it("skips without a live environment", () => {
    const missingEnv = join(tmpdir(), `missing-pumble-env-${Date.now()}`);
    const output = execFileSync("node", ["scripts/verify-live.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...scrubbedEnv(),
        PUMBLE_LIVE_ENV_FILE: missingEnv,
      },
      encoding: "utf8",
    });

    expect(output).toContain("verify:live skipped:");
  });

  it("loads a local env file without printing secret values", () => {
    const temp = mkdtempSync(join(tmpdir(), "pumble-verify-live-"));
    try {
      const envFile = join(temp, "live.env");
      const npmLog = join(temp, "npm.log");
      const fakeNpm = join(temp, "npm");
      const fakeKey = "fixture-secret-key";

      writeFileSync(envFile, `export PUMBLE_API_KEY="${fakeKey}"\n`);
      writeFileSync(
        fakeNpm,
        `#!/bin/sh\nprintf '%s\\n' "$*" >> "${npmLog}"\nexit 0\n`,
        { mode: 0o755 },
      );

      const output = execFileSync("node", ["scripts/verify-live.mjs"], {
        cwd: new URL("..", import.meta.url),
        env: {
          ...scrubbedEnv(),
          PATH: `${temp}${delimiter}${process.env.PATH ?? ""}`,
          PUMBLE_LIVE_ENV_FILE: envFile,
        },
        encoding: "utf8",
      });

      expect(output).not.toContain(fakeKey);
      expect(readFileSync(npmLog, "utf8").trim().split(/\n/)).toEqual([
        "run build",
        "run test:arazzo",
        "run test:live",
        "run test:facade:live",
        "run test:mcp:live",
      ]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
