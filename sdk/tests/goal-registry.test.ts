import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..");
const goalsDir = join(repoRoot, ".goals");
const VALID_STATUS = ["planned", "active", "blocked", "done"] as const;
const VALID_PRIORITY = ["P0", "P1", "P2", "P3"] as const;

function listGoalFiles(): string[] {
  return readdirSync(goalsDir)
    .filter((f) => /^G\d{2}-.+\.yaml$/.test(f))
    .map((f) => join(goalsDir, f));
}

function doneGoalLinks(): Array<{ file: string; testPaths: string[] }> {
  return listGoalFiles()
    .map((file) => {
      const doc = parseYaml(readFileSync(file, "utf8")) as {
        status?: string;
        links?: { tests?: unknown };
      };
      if (doc.status !== "done") return null;
      const tests = Array.isArray(doc.links?.tests) ? (doc.links!.tests as unknown[]) : [];
      const testPaths = tests.filter((p): p is string => typeof p === "string");
      return { file, testPaths };
    })
    .filter((entry): entry is { file: string; testPaths: string[] } => entry !== null);
}

describe("goal registry", () => {
  it("has manifest + README", () => {
    expect(statSync(join(goalsDir, "manifest.yaml")).isFile()).toBe(true);
    expect(statSync(join(goalsDir, "README.md")).isFile()).toBe(true);
  });

  it("declares 30 goals (G00..G29)", () => {
    const ids = listGoalFiles().map((p) => p.match(/G\d{2}/)![0]).sort();
    expect(ids).toEqual(
      Array.from({ length: 30 }, (_, i) => `G${String(i).padStart(2, "0")}`),
    );
  });

  it.each(listGoalFiles())("validates shape of %s", (file) => {
    const doc = parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;
    expect(typeof doc.id).toBe("string");
    expect(doc.id).toMatch(/^G\d{2}$/);
    expect(typeof doc.title).toBe("string");
    expect(VALID_PRIORITY).toContain(doc.priority as string);
    expect(VALID_STATUS).toContain(doc.status as string);
    const scope = doc.scope as { allowed?: unknown; forbidden?: unknown } | undefined;
    expect(Array.isArray(scope?.allowed)).toBe(true);
    expect(Array.isArray(scope?.forbidden)).toBe(true);
    expect(Array.isArray(doc.acceptance)).toBe(true);
    expect((doc.acceptance as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(doc.commands)).toBe(true);
    expect(Array.isArray(doc.adversarial_checks)).toBe(true);
    expect((doc.adversarial_checks as unknown[]).length).toBeGreaterThan(0);
  });

  it.each(doneGoalLinks())(
    "$file (status:done) lists at least one test in links.tests",
    ({ testPaths }) => {
      expect(testPaths.length).toBeGreaterThan(0);
    },
  );

  it.each(
    doneGoalLinks().flatMap(({ file, testPaths }) =>
      testPaths.map((path) => ({ file, path })),
    ),
  )("$file -> $path exists on disk", ({ path }) => {
    expect(existsSync(resolve(repoRoot, path)), path).toBe(true);
  });
});
