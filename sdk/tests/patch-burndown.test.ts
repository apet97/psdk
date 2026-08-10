import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line import/no-unresolved
import { PATCH_REGISTRY } from "../scripts/patch-generated-runtime.mjs";

const docPath = resolve(__dirname, "..", "docs", "patch-burndown.md");
const countPath = resolve(__dirname, "..", "docs", "PATCH-COUNT.txt");

type PatchEntry = { id: string };
const registryIds = (PATCH_REGISTRY as PatchEntry[]).map((p) => p.id);

function parseDocPatchIds(doc: string): string[] {
  // The burndown doc renders one markdown table row per registered patch.
  // The first column is the patch id. Skip the header and separator rows.
  const ids: string[] = [];
  for (const line of doc.split("\n")) {
    const match = line.match(/^\|\s*([a-z0-9][a-z0-9-]+)\s*\|/);
    if (!match) continue;
    if (match[1] === "ID") continue;
    ids.push(match[1]!);
  }
  return ids;
}

describe("patch burndown", () => {
  const doc = readFileSync(docPath, "utf8");
  const count = Number.parseInt(readFileSync(countPath, "utf8").trim(), 10);
  const docIds = parseDocPatchIds(doc);

  it("PATCH_REGISTRY is non-empty", () => {
    expect(registryIds.length).toBeGreaterThan(0);
  });

  it("PATCH-COUNT matches PATCH_REGISTRY length", () => {
    expect(count).toBe(registryIds.length);
  });

  it("doc lists exactly the patches PATCH_REGISTRY declares", () => {
    expect([...docIds].sort()).toEqual([...registryIds].sort());
  });

  it.each(registryIds)("patch '%s' has a removal-condition column", (id) => {
    const row = doc
      .split("\n")
      .find((line) => line.startsWith(`| ${id} `) || line.startsWith(`| ${id}|`));
    expect(row, `missing row for ${id}`).toBeDefined();
    expect(row).toMatch(/\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/);
  });

  it("doc File column matches the registry files array", () => {
    type Entry = { id: string; files?: string[] };
    for (const entry of PATCH_REGISTRY as Entry[]) {
      expect(
        Array.isArray(entry.files),
        `patch '${entry.id}' must declare a files array`,
      ).toBe(true);
      const row = doc
        .split("\n")
        .find((line) =>
          line.startsWith(`| ${entry.id} `) || line.startsWith(`| ${entry.id}|`)
        );
      expect(row, `missing burndown row for ${entry.id}`).toBeDefined();
      const fileCell = row!.split("|")[2] ?? "";
      const listed = fileCell
        .split(",")
        .map((cell) => cell.replace(/`/g, "").trim())
        .filter(Boolean)
        .sort();
      expect(listed).toEqual([...(entry.files ?? [])].sort());
    }
  });
});
