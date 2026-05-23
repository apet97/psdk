import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

type PackageJson = {
  name: string;
  exports: Record<string, string | Record<string, string>>;
};

const quickstart = readFileSync(new URL("../docs/QUICKSTART.md", import.meta.url), "utf8");
const integrationUsage = readFileSync(
  new URL("../docs/INTEGRATION-USAGE.md", import.meta.url),
  "utf8",
);
const packageSplit = readFileSync(new URL("../docs/PACKAGE-SPLIT.md", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const context = readFileSync(new URL("../../CONTEXT.md", import.meta.url), "utf8");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as PackageJson;
const sdkRoot = resolve(new URL("..", import.meta.url).pathname);
const repoRoot = resolve(sdkRoot, "..");
const architectureDecisionRecords = [
  {
    path: "docs/adr/0001-generated-sdk-is-regenerated.md",
    phrase: "Generated SDK is regenerated",
  },
  {
    path: "docs/adr/0002-facade-failures-are-values.md",
    phrase: "Facade failures are values",
  },
  {
    path: "docs/adr/0003-curated-mcp-writes-use-preview-confirm.md",
    phrase: "Curated MCP writes use preview and confirm",
  },
  {
    path: "docs/adr/0004-resolver-cache-is-explicit-in-memory.md",
    phrase: "Resolver cache is explicit in-memory",
  },
  {
    path: "docs/adr/0005-live-smoke-output-is-redacted.md",
    phrase: "Live smoke output is redacted",
  },
];

const requiredQuickstartHeadings = [
  "install",
  "create client",
  "resolve channel/user",
  "send message",
  "reply to thread",
  "verify webhook",
  "run curated mcp readonly",
  "run curated mcp write with preview/confirmation",
  "live test command list",
];

const requiredIntegrationUsagePhrases = [
  "Generated And Hand-Written Boundary",
  "curated profile",
  "Resolve before act",
  "Curated message writes require preview and confirmation",
  "Do not put API keys",
];

function markdownHeadings(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("##"))
    .map((line) =>
      line
        .replace(/^#+\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/`/g, "")
        .trim()
        .toLowerCase(),
    );
}

function documentedImports(markdown: string): Array<{ clause: string; specifier: string }> {
  const imports: Array<{ clause: string; specifier: string }> = [];
  const codeFencePattern = /```(?:ts|typescript|js|javascript)\n([\s\S]*?)```/g;
  for (const fence of markdown.matchAll(codeFencePattern)) {
    const code = fence[1];
    const importPattern = /import\s+([\s\S]*?)\s+from\s+["'](pumble-sdk[^"']*)["']/g;
    for (const importMatch of code.matchAll(importPattern)) {
      imports.push({
        clause: importMatch[1].replace(/\s+/g, " ").trim(),
        specifier: importMatch[2],
      });
    }
  }
  return imports;
}

function exportTargetFor(specifier: string): string | undefined {
  const packageSubpath =
    specifier === packageJson.name ? "." : `.${specifier.slice(packageJson.name.length)}`;
  const exact = packageJson.exports[packageSubpath];
  if (exact) return targetPath(exact, "");

  for (const [pattern, entry] of Object.entries(packageJson.exports)) {
    if (!pattern.includes("*")) continue;
    const [prefix, suffix] = pattern.split("*");
    if (!packageSubpath.startsWith(prefix) || !packageSubpath.endsWith(suffix)) continue;
    const wildcard = packageSubpath.slice(prefix.length, packageSubpath.length - suffix.length);
    return targetPath(entry, wildcard);
  }

  return undefined;
}

function targetPath(entry: string | Record<string, string>, wildcard: string): string {
  const rawTarget = typeof entry === "string" ? entry : entry.source ?? entry.default;
  return rawTarget.replace("*", wildcard);
}

function namedImports(clause: string): string[] {
  const named = clause.match(/^\{([\s\S]*)\}$/);
  if (!named) return [];
  return named[1]
    .split(",")
    .map((part) =>
      part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        .trim(),
    )
    .filter(Boolean);
}

function extensionBarrelExports(): Set<string> {
  const source = readFileSync(new URL("../src/extensions/index.ts", import.meta.url), "utf8");
  const exports = new Set<string>();
  const exportPattern = /export(?:\s+type)?\s+\{([\s\S]*?)\}\s+from/g;
  for (const exportMatch of source.matchAll(exportPattern)) {
    for (const rawExport of exportMatch[1].split(",")) {
      const name = rawExport
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        .trim();
      if (name) exports.add(name);
    }
  }
  return exports;
}

describe("docs", () => {
  test("quickstart is organized around first-success outcomes", () => {
    expect(markdownHeadings(quickstart)).toEqual(
      expect.arrayContaining(requiredQuickstartHeadings),
    );
    expect(quickstart).not.toContain("pumble-mcp-curated");
    expect(quickstart).not.toMatch(/\bOAuth\b/i);
    expect(quickstart).not.toMatch(/\bsocket mode\b/i);
  });

  test("documented package imports resolve through package exports", () => {
    const imports = [...documentedImports(quickstart), ...documentedImports(readme)];
    expect(imports.length).toBeGreaterThan(0);

    for (const { specifier } of imports) {
      const target = exportTargetFor(specifier);
      expect(target, specifier).toBeDefined();
      expect(existsSync(resolve(sdkRoot, target!)), `${specifier} -> ${target}`).toBe(true);
    }
  });

  test("documented extension imports are exported by the public extension barrel", () => {
    const exports = extensionBarrelExports();
    const extensionImports = [...documentedImports(quickstart), ...documentedImports(readme)]
      .filter(({ specifier }) => specifier === "pumble-sdk/extensions/index.js")
      .flatMap(({ clause }) => namedImports(clause));

    expect(extensionImports.length).toBeGreaterThan(0);
    for (const name of extensionImports) {
      expect(exports.has(name), name).toBe(true);
    }
  });

  test("public docs point to local integration sources", () => {
    for (const relativePath of [
      "README.md",
      "docs/QUICKSTART.md",
      "docs/INTEGRATION-USAGE.md",
      "docs/PACKAGE-SPLIT.md",
      "../PumbleOpenApi.yaml",
    ]) {
      expect(existsSync(resolve(sdkRoot, relativePath)), relativePath).toBe(true);
    }
  });

  test("root context documents SDKP vocabulary and non-negotiables", () => {
    for (const phrase of [
      "Generated SDK",
      "Handwritten extensions",
      "Facade",
      "Resolver",
      "Resolver cache",
      "Curated MCP",
      "Live smoke",
      "Replay fixtures",
      "Generated directories are regenerated, not hand-edited",
      "Facade failures are values",
      "Fresh writes should be proven with direct read endpoints",
      "MCP writes must remain preview/confirm",
      "Final live-smoke output must remain redacted",
    ]) {
      expect(context).toContain(phrase);
    }
  });

  test("architecture decisions are captured as accepted ADRs from root context", () => {
    expect(context).toContain("## Architecture Decisions");

    for (const adr of architectureDecisionRecords) {
      const absolute = resolve(repoRoot, adr.path);
      expect(existsSync(absolute), adr.path).toBe(true);
      const markdown = readFileSync(absolute, "utf8");
      expect(markdown).toContain("Status: Accepted");
      expect(markdown).toContain("## Context");
      expect(markdown).toContain("## Decision");
      expect(markdown).toContain("## Consequences");
      expect(markdown).toContain(adr.phrase);
      expect(context).toContain(adr.path);
    }
  });

  test("integration usage states MCP write contracts without unsupported modes", () => {
    for (const phrase of requiredIntegrationUsagePhrases) {
    expect(integrationUsage).toContain(phrase);
  }
  expect(integrationUsage).toContain("pumble-mcp start` defaults to the curated profile");
  expect(integrationUsage).toContain("send_message_preview");
  expect(integrationUsage).toContain("reply_to_thread_preview");
  expect(integrationUsage).toContain("reply_to_thread_confirmed");
  expect(integrationUsage).toContain("{ ok, summary, ids, data, nextActions }");
  expect(quickstart).toContain("Curated read tools return clean envelopes");
  expect(quickstart).toContain("npm run test:facade:live");
  expect(quickstart).toContain("npm run test:mcp:live");
  expect(readme).toContain("resolverCache");
  expect(readme).toContain("resolvers.refresh()");
  expect(readme).toContain("npm run verify:live");
  expect(integrationUsage).toContain("curated MCP live smoke");
  expect(integrationUsage).toContain("import-safe");
  expect(integrationUsage).not.toMatch(/\bOAuth\b/i);
  expect(integrationUsage).not.toMatch(/\bsocket mode\b/i);
});

  test("package split policy documents extraction gates without promising a split", () => {
    expect(readme).toContain("docs/PACKAGE-SPLIT.md");
    expect(readme).toContain("currently publishes one package: `pumble-sdk`");

    for (const packageName of [
      "@pumble/sdk-core",
      "@pumble/webhooks",
      "@pumble/testing",
      "@pumble/app-framework",
      "@pumble/mcp",
    ]) {
      expect(packageSplit).toContain(packageName);
    }

    for (const gate of [
      "Public APIs",
      "import paths",
      "npm run test:pack",
      "Two live runs",
      "no hand patches in generated source",
    ]) {
      expect(packageSplit).toContain(gate);
    }

    expect(packageSplit).toContain("Do not split packages yet.");
    expect(packageSplit).toContain("Latest dry-run gate: package split is blocked.");
    expect(packageSplit).toContain("Two live verification runs must be recorded");
    expect(packageSplit).toContain("Compatibility tests must prove existing `pumble-sdk` import paths");
    expect(packageSplit).not.toMatch(/will split|is split into|now publishes/i);
  });
});
