import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line import/no-unresolved
import { auditAttribution } from "../scripts/attribution-audit.mjs";

const HEADER = `/**
 * @derived-from CAKE-com/pumble-node-sdk
 * @upstream-path pumble-sdk/src/x.ts
 * @license ISC
 * Copyright (c) CAKE.com Inc. and CAKE-com/pumble-node-sdk contributors.
 */
`;

function tmpRepo() {
  const root = mkdtempSync(join(tmpdir(), "attr-audit-"));
  const upstream = join(root, "sdk", "knowledge", "upstream", "events");
  mkdirSync(upstream, { recursive: true });
  const notices = join(root, "THIRD_PARTY_NOTICES.md");
  return { root, upstream, notices };
}

describe("attribution audit", () => {
  it("passes when notices match the upstream tree", () => {
    const { root, upstream, notices } = tmpRepo();
    writeFileSync(join(upstream, "x.ts"), `${HEADER}export const x = 1;\n`);
    writeFileSync(
      notices,
      "# Notices\n\n| Path | Upstream source | Notes |\n| --- | --- | --- |\n| `sdk/knowledge/upstream/events/x.ts` | pumble-sdk/src/x.ts | seed |\n",
    );
    const errors = auditAttribution({
      upstreamDir: upstream,
      noticesPath: notices,
      repoRoot: root,
    });
    expect(errors).toEqual([]);
  });

  it("fails when an upstream file lacks the attribution header", () => {
    const { root, upstream, notices } = tmpRepo();
    writeFileSync(join(upstream, "x.ts"), "export const x = 1;\n");
    writeFileSync(
      notices,
      "| Path | Upstream source | Notes |\n| --- | --- | --- |\n| `sdk/knowledge/upstream/events/x.ts` | pumble-sdk/src/x.ts | seed |\n",
    );
    const errors = auditAttribution({
      upstreamDir: upstream,
      noticesPath: notices,
      repoRoot: root,
    });
    expect(errors.some((e) => e.includes("header missing marker"))).toBe(true);
  });

  it("fails when a file is on disk but not listed in notices", () => {
    const { root, upstream, notices } = tmpRepo();
    writeFileSync(join(upstream, "x.ts"), `${HEADER}export const x = 1;\n`);
    writeFileSync(notices, "# Notices\n\nempty table\n");
    const errors = auditAttribution({
      upstreamDir: upstream,
      noticesPath: notices,
      repoRoot: root,
    });
    expect(errors.some((e) => e.includes("not listed"))).toBe(true);
  });

  it("fails when a listed file is missing on disk", () => {
    const { root, upstream, notices } = tmpRepo();
    writeFileSync(
      notices,
      "| Path | Upstream source | Notes |\n| --- | --- | --- |\n| `sdk/knowledge/upstream/events/ghost.ts` | pumble-sdk/src/x.ts | seed |\n",
    );
    const errors = auditAttribution({
      upstreamDir: upstream,
      noticesPath: notices,
      repoRoot: root,
    });
    expect(errors.some((e) => e.includes("missing on disk"))).toBe(true);
  });

  it("fails when the notices file itself is missing", () => {
    const { root, upstream } = tmpRepo();
    const ghostNotices = join(root, "nope", "THIRD_PARTY_NOTICES.md");
    const errors = auditAttribution({
      upstreamDir: upstream,
      noticesPath: ghostNotices,
      repoRoot: root,
    });
    expect(errors.some((e) => e.includes("missing notices file"))).toBe(true);
  });

  it("passes when the upstream tree is absent (no lift has happened yet)", () => {
    const { root, notices } = tmpRepo();
    writeFileSync(notices, "# Notices\n\nnothing yet\n");
    const errors = auditAttribution({
      upstreamDir: join(root, "sdk", "knowledge", "upstream-missing"),
      noticesPath: notices,
      repoRoot: root,
    });
    expect(errors).toEqual([]);
  });
});
