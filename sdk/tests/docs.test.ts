import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it, test } from "vitest";

function listMarkdownFiles(
  cwd: string,
  isExcluded: (relativePath: string) => boolean,
): string[] {
  const found: string[] = [];
  const stack: string[] = [cwd];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      const rel = relative(cwd, absolute);
      if (entry.isDirectory()) {
        if (isExcluded(`${rel}/`)) continue;
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".md")) continue;
      if (isExcluded(rel)) continue;
      found.push(rel);
    }
  }
  return found;
}

type PackageJson = {
  name: string;
  files: string[];
  exports: Record<string, string | Record<string, string>>;
};

const quickstart = readFileSync(new URL("../docs/QUICKSTART.md", import.meta.url), "utf8");
const integrationUsage = readFileSync(
  new URL("../docs/INTEGRATION-USAGE.md", import.meta.url),
  "utf8",
);
const packageSplit = readFileSync(new URL("../docs/PACKAGE-SPLIT.md", import.meta.url), "utf8");
const stability = readFileSync(new URL("../docs/STABILITY.md", import.meta.url), "utf8");
const errorsGuide = readFileSync(new URL("../docs/ERRORS.md", import.meta.url), "utf8");
const apiReference = readFileSync(new URL("../docs/API-REFERENCE.md", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const rootReadme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
const context = readFileSync(new URL("../../CONTEXT.md", import.meta.url), "utf8");
const security = readFileSync(new URL("../../SECURITY.md", import.meta.url), "utf8");
const support = readFileSync(new URL("../docs/SUPPORT.md", import.meta.url), "utf8");
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
  {
    path: "docs/adr/0006-non-idempotent-writes-do-not-retry.md",
    phrase: "Non-idempotent writes do not retry",
  },
  {
    path: "docs/adr/0007-sdk-debug-output-is-redacted.md",
    phrase: "SDK debug output is redacted",
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

const requiredApiReferenceHeadings = [
  "raw sdk",
  "facade",
  "errors",
  "pagination",
  "mcp",
  "cli",
  "webhooks",
  "stability",
];

const requiredApiReferencePhrases = [
  'import { PumbleSDK } from "pumble-keys-sdk";',
  "channels",
  "messages",
  "scheduledMessages",
  "users",
  'import { createPumbleClient } from "pumble-keys-sdk/extensions/index.js";',
  "messages.send",
  "messages.dm",
  "threads.reply",
  "search.recent",
  "resolvers.preflight",
  "resolvers.clearCache",
  "resolvers.refresh",
  "resolvers.cacheInfo",
  "type FacadeResult<T>",
  "Raw SDK methods throw SDK errors",
  "facade operations return value failures",
  "searchAllMessages",
  "timestamp cursors",
  "same-second boundaries",
  "pumble-keys-mcp start --profile curated",
  "stdio",
  "127.0.0.1",
  "bearer auth",
  "`pumble-keys`",
  "`pumble-keys-mcp`",
  "signature verification",
  "event handler/router",
];

const requiredChangelogHeadings = [
  "generated api",
  "facade",
  "cli/mcp",
  "webhooks/app helpers",
  "security",
  "docs",
  "migration notes",
];

const requiredPublicSurfaceRows = [
  "| `.` | `pumble-keys-sdk` | Raw SDK + façade re-exports | stable |",
  "| `./extensions/index.js` | `pumble-keys-sdk/extensions/index.js` | Façade helpers | stable |",
  "| `./extensions/webhooks.js` | `pumble-keys-sdk/extensions/webhooks.js` | Webhook verification | stable |",
  "| `./extensions/telemetry.js` | `pumble-keys-sdk/extensions/telemetry.js` | Telemetry helpers | beta |",
  "| `./extensions/testing/index.js` | `pumble-keys-sdk/extensions/testing/index.js` | Testing/replay helpers | beta |",
  "| `./extensions/app/index.js` | `pumble-keys-sdk/extensions/app/index.js` | App/OAuth helpers | experimental |",
  "| `./extensions/app/socket-mode.js` | `pumble-keys-sdk/extensions/app/socket-mode.js` | Socket Mode | experimental |",
];

const requiredExtensionCategories = [
  "Facade helpers",
  "Pagination helpers",
  "Thread/context helpers",
  "Write confirmation helpers",
  "Resolver helpers",
  "Retry/error/rate-limit helpers",
  "Branded ID helpers",
  "Telemetry helpers",
  "Testing/replay helpers",
  "App/OAuth helpers",
  "Webhook verification",
];

const requiredFeedbackCoveragePhrases = [
  "package docs",
  "API reference",
  "facade failures",
  "error categorization",
  "exact-ID fast paths",
  "branded facade IDs",
  "MCP SSE host/auth",
  "search pagination overlap",
  "publish gate",
  "public surface labels",
  "runtime patch guard",
  "retry backoff",
  "examples packaging decision",
  "OAuth/app status",
  "package split decision",
  "resolver cache performance docs",
  "CLI docs",
  "architecture diagram",
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
    const code = fence[1]!;
    const importPattern = /import\s+([\s\S]*?)\s+from\s+["'](pumble-keys-sdk[^"']*)["']/g;
    for (const importMatch of code.matchAll(importPattern)) {
      imports.push({
        clause: importMatch[1]!.replace(/\s+/g, " ").trim(),
        specifier: importMatch[2]!,
      });
    }
  }
  return imports;
}

function sdkReadmePackageDocLinks(): string[] {
  const links = new Set<string>();
  const linkPattern = /\[[^\]]+\]\((docs\/[^)#]+)(?:#[^)]+)?\)/g;
  for (const match of readme.matchAll(linkPattern)) {
    links.add(match[1]!);
  }
  return [...links].sort();
}

function exportTargetFor(specifier: string): string | undefined {
  const packageSubpath =
    specifier === packageJson.name ? "." : `.${specifier.slice(packageJson.name.length)}`;
  const exact = packageJson.exports[packageSubpath];
  if (exact) return targetPath(exact, "");

  for (const [pattern, entry] of Object.entries(packageJson.exports)) {
    if (!pattern.includes("*")) continue;
    const [prefix, suffix] = pattern.split("*");
    if (!packageSubpath.startsWith(prefix!) || !packageSubpath.endsWith(suffix!)) continue;
    const wildcard = packageSubpath.slice(prefix!.length, packageSubpath.length - suffix!.length);
    return targetPath(entry, wildcard);
  }

  return undefined;
}

function targetPath(entry: string | Record<string, string>, wildcard: string): string {
  const rawTarget = typeof entry === "string" ? entry : entry["source"] ?? entry["default"];
  return rawTarget!.replace("*", wildcard);
}

function namedImports(clause: string): string[] {
  const named = clause.match(/^\{([\s\S]*)\}$/);
  if (!named) return [];
  return named[1]!
    .split(",")
    .map((part) =>
      part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]!
        .trim(),
    )
    .filter(Boolean);
}

function extensionBarrelExports(): Set<string> {
  const source = readFileSync(new URL("../src/extensions/index.ts", import.meta.url), "utf8");
  const exports = new Set<string>();
  const exportPattern = /export(?:\s+type)?\s+\{([\s\S]*?)\}\s+from/g;
  for (const exportMatch of source.matchAll(exportPattern)) {
    for (const rawExport of exportMatch[1]!.split(",")) {
      const name = rawExport
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]!
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
    // Decision-table CLI row must use the post-rename bin name. The
    // pre-rename token `pumble ...` (with a trailing space and ellipsis)
    // would silently slip past the rename test in identity.test.ts because
    // it lives inside a doc, not the bin file.
    expect(quickstart).not.toMatch(/\bpumble\s+\.{3}\b/);
    expect(quickstart).toMatch(/pumble-keys\s+\.{3}/);
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

  test("sdk readme docs links exist and are packaged", () => {
    const links = sdkReadmePackageDocLinks();
    expect(links.length).toBeGreaterThan(0);

    for (const relativePath of links) {
      expect(existsSync(resolve(sdkRoot, relativePath)), relativePath).toBe(true);
      expect(packageJson.files, relativePath).toContain(relativePath);
    }
  });

  test("documented extension imports are exported by the public extension barrel", () => {
    const exports = extensionBarrelExports();
    const extensionImports = [...documentedImports(quickstart), ...documentedImports(readme)]
      .filter(({ specifier }) => specifier === "pumble-keys-sdk/extensions/index.js")
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
      "Generated runtime patch",
      "Generated directories are regenerated, not hand-edited",
      "Generated runtime patches must live in `sdk/scripts/patch-generated-runtime.mjs`",
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
  expect(integrationUsage).toContain("pumble-keys-mcp start` defaults to the curated profile");
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
});

  test("package split policy documents extraction gates without promising a split", () => {
    expect(readme).toContain("docs/PACKAGE-SPLIT.md");
    expect(readme).toContain("currently publishes one package: `pumble-keys-sdk`");

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
    expect(packageSplit).toContain("Compatibility tests must prove existing `pumble-keys-sdk` import paths");
    expect(packageSplit).not.toMatch(/will split|is split into|now publishes/i);
  });

  test("stability docs label public surfaces and socket mode boundary", () => {
    expect(stability).toContain("Stable");
    expect(stability).toContain("Beta");
    expect(stability).toContain("Experimental");
    expect(stability).toContain("Socket Mode is experimental");
    expect(stability).toContain("Raw generated SDK");
    expect(stability).toContain("Facade");
    expect(stability).toContain("Curated MCP");
  });

  test("stability docs and api reference list supported public import paths", () => {
    for (const row of requiredPublicSurfaceRows) {
      expect(stability).toContain(row);
      expect(apiReference).toContain(row);
    }
  });

  test("stability docs represent every extension barrel category", () => {
    for (const category of requiredExtensionCategories) {
      expect(stability).toContain(category);
    }
  });

  test("errors guide covers raw thrown errors and facade failure values", () => {
    for (const phrase of [
      "Facade failures are values",
      "Raw SDK methods throw",
      "ResponseValidationError",
      "categorizeError",
      "assertFacadeOk",
      "lower-level Result",
    ]) {
      expect(errorsGuide).toContain(phrase);
    }
    expect(errorsGuide).toContain("Error Model By Surface");
    expect(errorsGuide).toContain("| Raw SDK (`new PumbleSDK`) |");
    expect(errorsGuide).toContain("| Facade (`createPumbleClient`) |");
    expect(errorsGuide).toContain("| MCP (`pumble-keys-mcp`) |");
  });

  test("docs state scheduled messages use the facade", () => {
    expect(readme).toContain("client.scheduled.create");
    expect(integrationUsage).toContain("Use `client.scheduled` for scheduled messages");
  });

  test("repo includes support, security, changelog, and api reference docs", () => {
    for (const relativePath of [
      "../SECURITY.md",
      "../CHANGELOG.md",
      "docs/SUPPORT.md",
      "docs/API-REFERENCE.md",
    ]) {
      expect(existsSync(resolve(sdkRoot, relativePath)), relativePath).toBe(true);
    }

    expect(security).toContain("Do not report secrets");
    expect(security).toContain("Pumble API keys");
    expect(security).toContain("GitHub private vulnerability reporting");

    expect(apiReference).toContain("Raw SDK");
    expect(apiReference).toContain("Facade");
    expect(apiReference).toContain("MCP");
  });

  test("api reference covers the supported sdk surfaces", () => {
    expect(markdownHeadings(apiReference)).toEqual(
      expect.arrayContaining(requiredApiReferenceHeadings),
    );

    for (const phrase of requiredApiReferencePhrases) {
      expect(apiReference).toContain(phrase);
    }
  });

  test("changelog includes release communication sections", () => {
    expect(markdownHeadings(changelog)).toEqual(
      expect.arrayContaining(requiredChangelogHeadings),
    );
    expect(changelog).toContain("## 0.3.21");
    expect(changelog).toContain("### Migration Notes");
  });

  test("docs describe resolver performance and cache boundaries", () => {
    expect(integrationUsage).toContain("Resolver Performance");
    expect(integrationUsage).toContain("listChannels");
    expect(integrationUsage).toContain("listUsers");
    expect(integrationUsage).toContain("exact IDs avoid ambiguity");
    expect(integrationUsage).toContain("resolverCache: { enabled: true, ttlMs: 60_000 }");
    expect(integrationUsage).toContain("process-local");
    expect(integrationUsage).toContain("Redis");
    expect(integrationUsage).toContain("Do not add Redis as a core dependency");
  });

  test("product docs use pumble-keys-sdk naming and keep examples repository-scoped", () => {
    for (const markdown of [
      rootReadme,
      readme,
      apiReference,
      integrationUsage,
      packageSplit,
      stability,
      errorsGuide,
    ]) {
      expect(markdown).toContain("pumble-keys-sdk");
      expect(markdown).not.toMatch(/\bpsdk\b/i);
    }

    expect(readme).toContain("Repository examples live in the source tree under `examples/`");
    expect(readme).toContain("They are not included in the npm tarball");
    expect(rootReadme).toContain("Pumble TypeScript SDK / Developer Toolkit");
    expect(readme).toContain("Pumble TypeScript SDK / Developer Toolkit");
    expect(readme).toContain("generated with Speakeasy");
    expect(readme).not.toMatch(/\bSDK generator\b/i);
    expect(apiReference).not.toMatch(/\bStainless\b/i);
    expect(apiReference).not.toMatch(/\bSpeakeasy-class SDK platform\b/i);
    expect(apiReference).not.toMatch(/after branch implementation/i);
    expect(apiReference).toContain(
      "Facade operations return value failures for resolver failures and operation failures.",
    );
    expect(readme).toContain("Stable, Beta, Experimental");
    expect(readme).toContain("docs/verification/v0.3.21.md");
    expect(apiReference).toContain("docs/verification/v0.3.21.md");
    expect(existsSync(resolve(sdkRoot, "docs/verification/v0.3.21.md"))).toBe(true);
    expect(packageJson.files).toContain("docs/verification/v0.3.21.md");
    expect(readme).toContain("docs/MIGRATING.md");
    expect(apiReference).toContain("docs/MIGRATING.md");
  });

  test("docs mark app and oauth helpers experimental without complete flow claims", () => {
    expect(stability).toMatch(
      /`pumble-keys-sdk\/extensions\/app\/index\.js`.*experimental/i,
    );
    expect(apiReference).toContain(
      "| `pumble-keys-sdk/extensions/app/index.js` | App/OAuth helpers | Experimental |",
    );
    for (const markdown of [apiReference, stability]) {
      expect(markdown).toContain("OAuth/app helpers are experimental utilities");
      expect(markdown).toContain(
        "do not provide a complete install, token refresh, storage, and workspace-selection flow",
      );
      expect(markdown).toContain(
        "OAuth/app helpers and Socket Mode are experimental.",
      );
    }

    expect(apiReference).toContain("API-key SDK auth is stable");
  });

  test("cli docs include help, stdio, and local sse token examples", () => {
    for (const phrase of [
      "pumble-keys --help",
      "pumble-keys-mcp start --help",
      "--api-key-file",
      "--api-key-stdin",
      "Prefer `PUMBLE_API_KEY`, `--api-key-file`, or `--api-key-stdin`",
      "--transport stdio",
      "--transport sse",
      "--host 127.0.0.1",
      "--auth-token \"$PUMBLE_MCP_TOKEN\"",
      "--allow-raw-writes",
      "--audit-log",
    ]) {
      expect(apiReference).toContain(phrase);
      expect(readme).toContain(phrase);
    }
  });

  test("api reference includes a compact sdk architecture diagram", () => {
    expect(apiReference).toContain("```mermaid");
    for (const label of [
      "OpenAPI spec",
      "Raw SDK",
      "Facade",
      "CLI",
      "Curated MCP",
      "Webhooks/App",
    ]) {
      expect(apiReference).toContain(label);
    }
  });

  test("resolver cache docs state defaults, promise shape, and manual controls", () => {
    for (const markdown of [readme, integrationUsage]) {
      expect(markdown).toContain("resolverCache` defaults to `false`");
      expect(markdown).toContain("one in-memory channel/user list per client");
      expect(markdown).toContain("ttlMs");
      expect(markdown).toContain("manual `refresh()` and `clearCache()`");
    }
  });

  test("package split remains blocked on concrete release gates", () => {
    for (const phrase of [
      "package split is blocked",
      "package boundaries",
      "docs",
      "pack smoke",
      "migration tests",
    ]) {
      expect(packageSplit).toContain(phrase);
    }
    expect(packageSplit).not.toMatch(/now publishes|already split|split packages now/i);
  });

  test("feedback coverage section lists implemented feedback areas", () => {
    const coverageDocs = `${apiReference}\n${stability}`;

    expect(coverageDocs).toContain("## Feedback Coverage");
    for (const phrase of requiredFeedbackCoveragePhrases) {
      expect(coverageDocs).toContain(phrase);
    }
  });

  test("root contribution and runtime docs exist", () => {
    expect(existsSync(resolve(sdkRoot, "../CONTRIBUTING.md"))).toBe(true);
    expect(support).toContain("Runtime Support");
    expect(support).toContain("Node.js 20+ ESM");
    expect(support).toContain("Browser");
    expect(support).toContain("not claimed");
    expect(readme).toContain("Node.js 20+ ESM");
    expect(apiReference).toContain("Release Evidence Checklist");
    expect(apiReference).toContain("npm provenance");
    expect(apiReference).toContain("Live verification result with redacted output");
    expect(support).toContain("Support Matrix");
    expect(support).toContain("| Browser/edge runtime | Not supported in `0.3.x` |");
    expect(support).toContain("For organization deployments:");
  });
});

describe("product identity guard", () => {
  const guardRepoRoot = resolve(__dirname, "..", "..");
  const FORBIDDEN = [
    "SDK generator platform",
    "Stainless competitor",
    "multi-language generator",
    "production-grade",
    "industrial-strength",
    "world-class",
    "best-in-class",
  ];
  // AGENTS.md and CLAUDE.md enumerate the forbidden list verbatim as
  // part of their guidance role - that is their job, not a regression.
  // Pinning sync with the manifest moves to tests/agents-docs.test.ts.
  const ALLOWED_FILES = [
    "docs/product/sdk-generator-product-boundary.md",
    "AGENTS.md",
    "CLAUDE.md",
  ];
  const docFiles = listMarkdownFiles(guardRepoRoot, (rel) =>
    rel.includes("node_modules") ||
    rel.includes("esm/") ||
    rel.includes("dist/") ||
    rel.includes(".remember/") ||
    rel.includes("docs/superpowers/") ||
    rel.includes("docs/product/") ||
    rel.startsWith("officialsdk/"),
  );

  it.each(FORBIDDEN)("'%s' appears only in the boundary doc", (phrase) => {
    const hits = docFiles
      .filter((rel) => !ALLOWED_FILES.includes(rel))
      .filter((rel) => readFileSync(join(guardRepoRoot, rel), "utf8").includes(phrase));
    expect(hits).toEqual([]);
  });
});

describe("operations checklist boundary", () => {
  const ops = readFileSync(new URL("../docs/OPERATIONS-CHECKLIST.md", import.meta.url), "utf8");
  const NEVER = ["SLA", "SSO", "SCIM", "account manager", "premium support", "hosted control plane"];

  it.each(NEVER)("does not promise %s", (claim) => {
    expect(ops).not.toContain(claim);
  });

  it("covers deployment knobs we do provide", () => {
    expect(ops).toContain("Secret management");
    expect(ops).toContain("Audit log retention");
    expect(ops).toContain("Rate-limit coordination");
  });
});

describe("docs IA", () => {
  const idx = readFileSync(new URL("../docs/INDEX.md", import.meta.url), "utf8");
  const sections = [
    "Start here",
    "SDK basics",
    "Facade workflows",
    "Raw SDK reference",
    "CLI",
    "MCP",
    "Knowledge",
    "Webhooks",
    "Observability",
    "Testing & replay",
    "Errors",
    "Releases & support",
    "Experimental",
  ];
  it.each(sections)("INDEX names section %s", (s) => expect(idx).toContain(s));

  it.each([
    "QUICKSTART.md",
    "API-REFERENCE.md",
    "CLI-REFERENCE.md",
    "MCP-SAFETY.md",
    "ERROR-MODEL.md",
    "RESOLVERS.md",
    "TESTING.md",
    "STABILITY.md",
    "SUPPORT.md",
    "MIGRATING.md",
    "verification/v0.3.21.md",
    "OBSERVABILITY.md",
    "RETRIES-TIMEOUTS-RATE-LIMITS.md",
    "SECURITY-CHECKLIST.md",
    "OPERATIONS-CHECKLIST.md",
    "REALTIME.md",
    "EXPERIMENTAL.md",
    "THIRD_PARTY_NOTICES.md",
  ])("INDEX links %s", (path) => {
    expect(idx).toContain(path);
  });

  // Knowledge section names the new MCP resource/prompt URIs so an
  // operator reading the index can find them without grepping MCP-SAFETY.
  it.each([
    "pumble://knowledge/{+path}",
    "pumble://events/{name}",
    "write_pumble_handler",
    "debug_pumble_webhook",
  ])("INDEX names knowledge surface %s", (token) => {
    expect(idx).toContain(token);
  });

  // Every doc file under sdk/docs/ that is a top-level .md (not adr/,
  // models/, lib/, sdks/, verification/) must be reachable from INDEX.md
  // so a future doc add can't ship orphaned. The exclusion list is the
  // index itself plus generated/raw artefacts.
  it("every top-level sdk/docs/*.md is linked from INDEX or explicitly excluded", () => {
    const docsDir = new URL("../docs/", import.meta.url).pathname;
    const EXCLUDE = new Set(["INDEX.md"]);
    const topLevel = readdirSync(docsDir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name)
      .filter((n) => !EXCLUDE.has(n));
    const missing = topLevel.filter((name) => !idx.includes(name));
    expect(missing, "docs missing from INDEX.md").toEqual([]);
  });
});

describe("facade-first docs", () => {
  it("README's first ts code example uses createPumbleClient", () => {
    const firstBlock = readme.match(/```ts\n([\s\S]*?)\n```/);
    expect(firstBlock?.[1] ?? "").toContain("createPumbleClient");
  });

  it("Quickstart contains a 'Which API should I use?' section", () => {
    expect(quickstart).toMatch(/Which API should I use\?/);
    expect(quickstart).toContain("facade");
    expect(quickstart).toContain("raw SDK");
    expect(quickstart).toContain("CLI");
    expect(quickstart).toContain("curated MCP");
    expect(quickstart).toContain("webhooks");
  });
});

describe("MCP safety guidance", () => {
  it("README warns against exposing raw readwrite", () => {
    expect(readme).toMatch(/Do not expose this to agents you do not control/);
    expect(readme).toMatch(/curated profile/);
  });
});

describe("safe search pagination", () => {
  it("API reference recommends searchAllMessages for full walks", () => {
    expect(apiReference).toMatch(/searchAllMessages.*recommended/i);
  });

  it("Quickstart shows a searchAllMessages example", () => {
    expect(quickstart).toContain("searchAllMessages");
  });

  it("README links the safe search helper", () => {
    expect(readme).toContain("searchAllMessages");
  });
});

describe("product boundary", () => {
  const BOUNDARY_PHRASE = "Pumble API-Keys add-on";
  const UPSTREAM_REPO_LINK = "CAKE-com/pumble-node-sdk";
  const UPSTREAM_NPM_LINK = "npmjs.com/package/pumble-sdk";

  it.each([
    "../README.md",
    "README.md",
    "docs/API-REFERENCE.md",
  ])("%s contains the product boundary statement", (relativePath) => {
    const text = readFileSync(resolve(sdkRoot, relativePath), "utf8");
    expect(text, `${relativePath}: boundary phrase`).toContain(BOUNDARY_PHRASE);
    expect(text, `${relativePath}: upstream repo link`).toContain(UPSTREAM_REPO_LINK);
    expect(text, `${relativePath}: upstream npm link`).toContain(UPSTREAM_NPM_LINK);
    expect(text, `${relativePath}: product-boundary heading`).toMatch(/##\s+Product boundary/);
  });
});
