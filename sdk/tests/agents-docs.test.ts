import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const agentsPath = resolve(repoRoot, "AGENTS.md");
const claudePath = resolve(repoRoot, "CLAUDE.md");
const manifestPath = resolve(repoRoot, ".goals", "manifest.yaml");

interface Manifest {
  guardrails?: {
    generated_paths?: string[];
    forbidden_phrases?: string[];
  };
}

function readManifest(): Manifest {
  return parseYaml(readFileSync(manifestPath, "utf8")) as Manifest;
}

const manifest = readManifest();
const generatedPaths = manifest.guardrails?.generated_paths ?? [];
const forbiddenPhrases = manifest.guardrails?.forbidden_phrases ?? [];

describe("AGENTS.md + CLAUDE.md", () => {
  it("AGENTS.md exists at the repo root", () => {
    expect(existsSync(agentsPath), agentsPath).toBe(true);
  });

  it("CLAUDE.md exists at the repo root", () => {
    expect(existsSync(claudePath), claudePath).toBe(true);
  });

  it("CLAUDE.md points the reader at AGENTS.md as the source of truth", () => {
    const claude = readFileSync(claudePath, "utf8");
    expect(claude).toContain("AGENTS.md");
  });

  // AGENTS.md is the canonical reference for the
  // generated-vs-handwritten boundary; every path in
  // .goals/manifest.yaml#guardrails.generated_paths must appear there
  // so a contributor reading AGENTS.md doesn't think they can
  // hand-edit something that is actually regenerated.
  it.each(generatedPaths)("AGENTS.md lists generated path %s", (path) => {
    const agents = readFileSync(agentsPath, "utf8");
    expect(agents).toContain(path);
  });

  // The forbidden-phrases list must appear verbatim in both AGENTS.md
  // and CLAUDE.md, in sync with the manifest. The product identity
  // guard in tests/docs.test.ts allow-lists both files; this test
  // re-pins that the *full* list (no fewer, no quietly removed
  // entries) is enumerated, so the docs cannot silently drop a
  // forbidden phrase that the manifest still bans.
  it.each(forbiddenPhrases)("AGENTS.md enumerates forbidden phrase %s", (phrase) => {
    const agents = readFileSync(agentsPath, "utf8");
    expect(agents).toContain(phrase);
  });

  it.each(forbiddenPhrases)("CLAUDE.md enumerates forbidden phrase %s", (phrase) => {
    const claude = readFileSync(claudePath, "utf8");
    expect(claude).toContain(phrase);
  });

  // CLAUDE.md is the auto-loaded project-memory doc; it must call out
  // the offline-gate command verbatim so Claude doesn't shorten it to
  // `npm test` or invent a different invocation.
  it("CLAUDE.md names the offline verify command verbatim", () => {
    const claude = readFileSync(claudePath, "utf8");
    expect(claude).toContain("cd sdk && npm run verify:offline");
  });

  // The forbidden-phrases enumeration in AGENTS.md and CLAUDE.md must
  // *only* appear inside a dedicated section bounded by an H2
  // heading. If a phrase shows up in prose outside that section, it
  // means a doc edit accidentally smuggled forbidden marketing
  // language into the canonical agent docs - the failure mode the
  // product identity guard catches everywhere else.
  it.each(["AGENTS.md", "CLAUDE.md"])(
    "%s confines forbidden phrases to one dedicated section",
    (filename) => {
      const path = filename === "AGENTS.md" ? agentsPath : claudePath;
      const body = readFileSync(path, "utf8");
      const headingMatch = body.match(/^##\s+.*forbidden phrases.*$/im);
      expect(headingMatch, `${filename} must define a Forbidden phrases section`)
        .not.toBeNull();
      const sectionStart = headingMatch!.index!;
      const nextH2 = body.slice(sectionStart + 1).search(/^##\s/m);
      const sectionEnd = nextH2 === -1
        ? body.length
        : sectionStart + 1 + nextH2;
      const inside = body.slice(sectionStart, sectionEnd);
      const outside = body.slice(0, sectionStart) + body.slice(sectionEnd);
      for (const phrase of forbiddenPhrases) {
        expect(inside, `${filename}: ${phrase} must be inside Forbidden phrases`)
          .toContain(phrase);
        expect(outside, `${filename}: ${phrase} leaked outside Forbidden phrases`)
          .not.toContain(phrase);
      }
    },
  );
});
