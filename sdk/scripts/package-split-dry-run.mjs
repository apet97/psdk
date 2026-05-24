#!/usr/bin/env node
import { existsSync } from "node:fs";

const mappings = [
  {
    name: "@pumble/sdk-core",
    sources: [
      "src/index.ts",
      "src/sdk/sdk.ts",
      "src/models/index.ts",
      "src/extensions/client.ts",
      "src/extensions/find.ts",
      "src/extensions/resolve.ts",
      "src/extensions/thread-context.ts",
      "src/extensions/write-plan.ts",
    ],
    docs: ["README.md", "docs/QUICKSTART.md", "docs/INTEGRATION-USAGE.md"],
    tests: [
      "tests/client-facade.test.ts",
      "tests/resolve.test.ts",
      "tests/thread-context.test.ts",
      "tests/write-plan.test.ts",
    ],
  },
  {
    name: "@pumble/webhooks",
    sources: [
      "src/extensions/webhooks.ts",
      "src/extensions/webhook-events.ts",
      "src/extensions/app/event-router.ts",
      "src/extensions/app/http-receiver.ts",
    ],
    docs: ["README.md", "docs/QUICKSTART.md", "examples/webhook-server.ts"],
    tests: [
      "tests/webhooks.test.ts",
      "tests/app-event-router.test.ts",
      "tests/pumble-app.test.ts",
    ],
  },
  {
    name: "@pumble/testing",
    sources: [
      "src/extensions/testing/index.ts",
      "src/extensions/testing/fixtures.ts",
      "src/extensions/testing/mock-fetch.ts",
      "scripts/replayer.mjs",
      "scripts/recorder.mjs",
      "scripts/scan-fixtures.mjs",
      "bin/dry-run-shim.mjs",
    ],
    docs: ["docs/INTEGRATION-USAGE.md", "docs/PACKAGE-SPLIT.md", "examples/testing-fixtures.ts"],
    tests: [
      "tests/testing-helpers.test.ts",
      "tests/replay.test.ts",
      "tests/dry-run-shim.test.ts",
      "tests/examples.test.ts",
    ],
  },
  {
    name: "@pumble/app-framework",
    sources: [
      "src/extensions/app/index.ts",
      "src/extensions/app/pumble-app.ts",
      "src/extensions/app/oauth.ts",
      "src/extensions/app/socket-mode.ts",
      "src/extensions/app/token-store.ts",
    ],
    docs: ["docs/INTEGRATION-USAGE.md", "docs/PACKAGE-SPLIT.md", "docs/QUICKSTART.md"],
    tests: ["tests/pumble-app.test.ts", "tests/app-oauth.test.ts", "tests/socket-mode.test.ts"],
  },
  {
    name: "@pumble/mcp",
    sources: [
      "bin/pumble-keys-mcp.mjs",
      "bin/pumble-mcp-args.mjs",
      "src/mcp-server/curated/server.ts",
      "src/mcp-server/curated/tools.ts",
      "src/mcp-server/curated/read-tools.ts",
      "src/mcp-server/curated/write-tools.ts",
      "src/mcp-server/curated/resources.ts",
      "src/mcp-server/curated/prompts.ts",
    ],
    docs: ["README.md", "docs/QUICKSTART.md", "docs/INTEGRATION-USAGE.md", "examples/curated-mcp-preview.md"],
    tests: [
      "tests/pumble-mcp.test.ts",
      "tests/pumble-mcp-curated.test.ts",
      "tests/mcp-curated-read-tools.test.ts",
      "tests/mcp-curated-write-tools.test.ts",
      "tests/mcp-curated-resources.test.ts",
      "tests/mcp-agent-safety.test.ts",
    ],
  },
];

function validate(report) {
  const errors = [];
  for (const pkg of report.packages) {
    if (pkg.sources.length === 0) errors.push(`${pkg.name}: no source files mapped`);
    if (pkg.docs.length === 0) errors.push(`${pkg.name}: no docs mapped`);
    if (pkg.tests.length === 0) errors.push(`${pkg.name}: no tests mapped`);
    for (const path of [...pkg.sources, ...pkg.docs, ...pkg.tests]) {
      if (!existsSync(path)) errors.push(`${pkg.name}: mapped file missing: ${path}`);
    }
  }
  return errors;
}

const report = {
  mode: "dry-run",
  decision: "no files moved; extraction remains gated by docs/PACKAGE-SPLIT.md",
  packages: mappings,
};

const errors = validate(report);
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Package split dry run: no files moved.");
  for (const pkg of report.packages) {
    console.log(`\n${pkg.name}`);
    console.log(`  sources: ${pkg.sources.length}`);
    console.log(`  docs: ${pkg.docs.length}`);
    console.log(`  tests: ${pkg.tests.length}`);
  }
}
