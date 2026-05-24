import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line import/no-unresolved
import { checkGoals } from "../scripts/goal-check.mjs";

interface FakeRepo {
  readonly repoRoot: string;
  readonly goalsDir: string;
}

function makeRepo(): FakeRepo {
  const repoRoot = mkdtempSync(join(tmpdir(), "goal-check-"));
  const goalsDir = join(repoRoot, ".goals");
  mkdirSync(goalsDir, { recursive: true });
  return { repoRoot, goalsDir };
}

function manifest(...ids: string[]): string {
  const goals = ids.map((id) => `  - { id: ${id}, file: ${id}-x.yaml }`).join("\n");
  return `version: 1\ngoals:\n${goals}\n`;
}

function goalYaml(overrides: Partial<{
  id: string;
  title: string;
  priority: string;
  status: string;
  allowed: string[];
  forbidden: string[];
  acceptance: string[];
  commands: string[];
  adversarial_checks: string[];
  rollback: string;
  testLinks: string[];
}>): string {
  const yamlList = (label: string, items: string[]) =>
    items.length === 0 ? `${label}: []` : `${label}:\n${items.map((s) => `  - "${s}"`).join("\n")}`;
  const lines = [
    `id: ${overrides.id ?? "G99"}`,
    `title: ${overrides.title ?? "test goal"}`,
    `priority: ${overrides.priority ?? "P1"}`,
    `status: ${overrides.status ?? "done"}`,
    `scope:`,
    `  ${yamlList("allowed", overrides.allowed ?? ["sdk/foo"]).replace(/\n/g, "\n  ")}`,
    `  ${yamlList("forbidden", overrides.forbidden ?? []).replace(/\n/g, "\n  ")}`,
    yamlList("acceptance", overrides.acceptance ?? ["foo bar"]),
    yamlList("commands", overrides.commands ?? ["echo hi"]),
    yamlList("adversarial_checks", overrides.adversarial_checks ?? ["check x"]),
    `rollback: "${overrides.rollback ?? "git revert"}"`,
  ];
  if (overrides.testLinks !== undefined) {
    lines.push("links:");
    lines.push(yamlList("  tests", overrides.testLinks).replace(/\n/g, "\n  "));
  }
  return `${lines.join("\n")}\n`;
}

describe("goal-check", () => {
  it("passes when all goals are well-formed and links.tests files exist", () => {
    const { repoRoot, goalsDir } = makeRepo();
    writeFileSync(join(goalsDir, "manifest.yaml"), manifest("G01"));
    const testFile = join(repoRoot, "sdk", "tests", "x.test.ts");
    mkdirSync(join(repoRoot, "sdk", "tests"), { recursive: true });
    writeFileSync(testFile, "");
    writeFileSync(
      join(goalsDir, "G01-x.yaml"),
      goalYaml({ id: "G01", testLinks: ["sdk/tests/x.test.ts"] }),
    );
    const result = checkGoals({ goalsDir, repoRoot });
    expect(result.errors).toEqual([]);
    expect(result.goalCount).toBe(1);
  });

  // GAP F: the script enforces "status: done -> links.tests paths must
  // exist on disk", but no test pinned the script-level enforcement before
  // this commit. tests/goal-registry.test.ts asserts the live state, not
  // the script behaviour - if lines 100-110 of goal-check.mjs were
  // removed, no test would catch the regression.
  it("fails when a status:done goal's links.tests entry does not exist on disk", () => {
    const { repoRoot, goalsDir } = makeRepo();
    writeFileSync(join(goalsDir, "manifest.yaml"), manifest("G01"));
    writeFileSync(
      join(goalsDir, "G01-x.yaml"),
      goalYaml({
        id: "G01",
        status: "done",
        testLinks: ["sdk/tests/never-existed.test.ts"],
      }),
    );
    const result = checkGoals({ goalsDir, repoRoot });
    expect(
      result.errors.some((e) => e.includes("does not exist on disk")),
    ).toBe(true);
  });

  it("fails when a status:done goal has no links.tests", () => {
    const { repoRoot, goalsDir } = makeRepo();
    writeFileSync(join(goalsDir, "manifest.yaml"), manifest("G01"));
    writeFileSync(
      join(goalsDir, "G01-x.yaml"),
      goalYaml({ id: "G01", status: "done", testLinks: [] }),
    );
    const result = checkGoals({ goalsDir, repoRoot });
    expect(
      result.errors.some((e) =>
        e.includes("status: done requires at least one entry in links.tests"),
      ),
    ).toBe(true);
  });

  it("passes when a status:planned goal omits links.tests entirely", () => {
    const { repoRoot, goalsDir } = makeRepo();
    writeFileSync(join(goalsDir, "manifest.yaml"), manifest("G01"));
    writeFileSync(
      join(goalsDir, "G01-x.yaml"),
      goalYaml({ id: "G01", status: "planned" }),
    );
    const result = checkGoals({ goalsDir, repoRoot });
    expect(result.errors).toEqual([]);
  });

  it("flags goal count vs manifest mismatch", () => {
    const { repoRoot, goalsDir } = makeRepo();
    writeFileSync(join(goalsDir, "manifest.yaml"), manifest("G01", "G02"));
    writeFileSync(
      join(goalsDir, "G01-x.yaml"),
      goalYaml({ id: "G01", status: "planned" }),
    );
    const result = checkGoals({ goalsDir, repoRoot });
    expect(
      result.errors.some((e) =>
        e.includes("manifest declares 2 goals but 1 files exist"),
      ),
    ).toBe(true);
  });

  it("flags an unknown priority", () => {
    const { repoRoot, goalsDir } = makeRepo();
    writeFileSync(join(goalsDir, "manifest.yaml"), manifest("G01"));
    writeFileSync(
      join(goalsDir, "G01-x.yaml"),
      goalYaml({ id: "G01", priority: "P9", status: "planned" }),
    );
    const result = checkGoals({ goalsDir, repoRoot });
    expect(result.errors.some((e) => e.includes("invalid priority"))).toBe(true);
  });

  it("returns a structured error when manifest is missing", () => {
    const { repoRoot, goalsDir } = makeRepo();
    // Do not write the manifest.
    const result = checkGoals({ goalsDir, repoRoot });
    expect(result.errors.some((e) => e.includes("missing"))).toBe(true);
    expect(result.goalCount).toBe(0);
  });
});
