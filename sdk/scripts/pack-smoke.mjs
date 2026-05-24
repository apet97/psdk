#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const keepTemp = args.has("--keep") || process.env.PUMBLE_KEEP_PACK_SMOKE === "1";

function run(command, commandArgs, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd ?? sdkRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      const rendered = [command, ...commandArgs].join(" ");
      reject(new Error(`${rendered} exited ${code}${stderr ? `\n${stderr}` : ""}`));
    });
  });
}

function binPath(consumer, name) {
  const path = join(consumer, "node_modules", ".bin", name);
  if (!existsSync(path)) throw new Error(`missing package bin: ${name}`);
  return path;
}

function assertNoBin(consumer, name) {
  const path = join(consumer, "node_modules", ".bin", name);
  if (existsSync(path)) throw new Error(`unexpected package bin: ${name}`);
}

function assertTarEntry(files, path) {
  if (!files.has(`package/${path}`)) throw new Error(`tarball missing ${path}`);
}

function assertNoTarEntry(files, pattern, label) {
  for (const file of files) {
    if (pattern.test(file)) throw new Error(`tarball includes ${label}: ${file}`);
  }
}

const tempRoot = await mkdtemp(join(tmpdir(), "pumble-pack-smoke-"));
try {
  if (!skipBuild) await run("npm", ["run", "build"]);

  const packDir = join(tempRoot, "pack");
  const consumer = join(tempRoot, "consumer");
  await mkdir(packDir, { recursive: true });
  await mkdir(consumer, { recursive: true });

  const packed = await run("npm", ["pack", "--pack-destination", packDir, "--silent"], {
    capture: true,
  });
  const tarballName = packed.stdout.trim().split(/\n/).filter(Boolean).pop();
  if (!tarballName) throw new Error("npm pack did not report a tarball");
  const tarball = join(packDir, tarballName);
  const listing = await run("tar", ["-tzf", tarball], { capture: true });
  const tarFiles = new Set(listing.stdout.trim().split(/\n/).filter(Boolean));
  for (const path of [
    "README.md",
    "LICENSE",
    "package.json",
    "docs/API-REFERENCE.md",
    "docs/ERRORS.md",
    "docs/INTEGRATION-USAGE.md",
    "docs/PACKAGE-SPLIT.md",
    "docs/QUICKSTART.md",
    "docs/STABILITY.md",
    "docs/SUPPORT.md",
    "docs/MIGRATING.md",
    "docs/verification/v0.3.21.md",
    "bin/mcp-server.js",
    "bin/pumble-keys-cli.mjs",
    "bin/pumble-mcp-curated.js",
    "bin/pumble-keys-mcp.mjs",
    "esm/index.js",
    "src/index.ts",
  ]) {
    assertTarEntry(tarFiles, path);
  }
  assertNoTarEntry(tarFiles, /^package\/(?:tests|scripts|\.speakeasy)\//, "dev-only directories");
  assertNoTarEntry(tarFiles, /^package\/examples\//, "examples directory");
  assertNoTarEntry(tarFiles, /^package\/package-lock\.json$/, "package lock");
  assertNoTarEntry(tarFiles, /^package\/bin\/mcp-server\.js\.map$/, "MCP source map");
  assertNoTarEntry(tarFiles, /^package\/bin\/pumble-mcp-curated\.js\.map$/, "curated MCP source map");
  assertNoTarEntry(tarFiles, /^package\/esm\/.+\.map$/, "compiled source map");

  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2),
  );
  await run("npm", ["install", "--no-audit", "--no-fund", tarball], { cwd: consumer });

  const installedPkg = JSON.parse(
    await readFile(join(consumer, "node_modules/pumble-keys-sdk/package.json"), "utf8"),
  );
  if (JSON.stringify(Object.keys(installedPkg.bin).sort()) !== JSON.stringify(["pumble-keys", "pumble-keys-mcp"])) {
    throw new Error(`unexpected package bins: ${Object.keys(installedPkg.bin).sort().join(", ")}`);
  }
  if (installedPkg.license !== "MIT") throw new Error("package license metadata missing");
  if (installedPkg.engines?.node !== ">=20") throw new Error("package engines.node must be >=20");

  const smokeModule = join(consumer, "smoke.mjs");
  await writeFile(smokeModule, `
const checks = [
  ["pumble-keys-sdk", "PumbleSDK"],
  ["pumble-keys-sdk/core.js", "PumbleSDKCore"],
  ["pumble-keys-sdk/models/errors", "PumbleSDKError"],
  ["pumble-keys-sdk/extensions/index.js", "searchAllMessages"],
  ["pumble-keys-sdk/extensions/webhooks.js", "createWebhookHandler"],
  ["pumble-keys-sdk/lib/http", "HTTPClient"],
];

for (const [specifier, exportName] of checks) {
  const mod = await import(specifier);
  if (!(exportName in mod)) {
    throw new Error(\`\${specifier} missing export \${exportName}\`);
  }
}
console.log("documented exports ok");
`);
  await run("node", [smokeModule], { cwd: consumer });

  const pumbleHelp = await run(binPath(consumer, "pumble-keys"), ["--help"], { cwd: consumer, capture: true });
  if (!/Usage:/i.test(pumbleHelp.stdout)) throw new Error("pumble-keys --help did not print usage");

  const mcpHelp = await run(binPath(consumer, "pumble-keys-mcp"), ["--help"], { cwd: consumer, capture: true });
  if (!/Usage:/i.test(mcpHelp.stdout)) throw new Error("pumble-keys-mcp --help did not print usage");
  const generatedMcpHelp = await run(binPath(consumer, "pumble-keys-mcp"), ["start", "--help"], { cwd: consumer, capture: true });
  if (!/transport/i.test(generatedMcpHelp.stdout)) throw new Error("pumble-keys-mcp start --help did not reach generated server");
  const curatedHelp = await run("node", [join(consumer, "node_modules/pumble-keys-sdk/bin/pumble-mcp-curated.js"), "--help"], {
    cwd: consumer,
    capture: true,
  });
  if (!/workflow-first Pumble MCP server/i.test(curatedHelp.stdout)) {
    throw new Error("pumble-mcp-curated --help did not run from installed package");
  }
  assertNoBin(consumer, "mcp");
  assertNoBin(consumer, "pumble");
  assertNoBin(consumer, "pumble-mcp");

  console.log(`pack smoke passed: ${tarballName}`);
} finally {
  if (keepTemp) {
    console.log(`kept temp dir: ${tempRoot}`);
  } else {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
