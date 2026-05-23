#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");

function env(name) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : "";
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const ZERO_SHA = "0".repeat(64);
const PENDING = "pending";

const version = JSON.parse(readFileSync(join(sdkRoot, "package.json"), "utf8")).version;
const today = new Date().toISOString().slice(0, 10);
const repo = env("GITHUB_REPOSITORY") || "apet97/psdk";
const commit = env("GITHUB_SHA")
  || execFileSync("git", ["rev-parse", "HEAD"], { cwd: sdkRoot }).toString().trim();

function runUrl(idVarName, explicitUrlVarName) {
  const explicit = env(explicitUrlVarName);
  if (explicit) return explicit;
  const id = env(idVarName);
  if (!id || id === "0") return PENDING;
  return `https://github.com/${repo}/actions/runs/${id}`;
}

const ciRun = runUrl("CI_RUN_ID", "CI_RUN_URL");
const releaseRun = runUrl("GITHUB_RUN_ID", "RELEASE_RUN_URL");
const npmUrl = env("NPM_RELEASE_URL")
  || (env("NPM_PUBLISHED") === "true" ? `https://www.npmjs.com/package/pumble-sdk/v/${version}` : PENDING);

const provenanceEnv = env("NPM_PROVENANCE");
const provenance = ["attested", "none", "unverified"].includes(provenanceEnv)
  ? provenanceEnv
  : "unverified";

const smokeArtifact = env("LIVE_SMOKE_ARTIFACT") || "pending";

const tarballPath = env("TARBALL_PATH") || join(sdkRoot, `pumble-sdk-${version}.tgz`);
if (!existsSync(tarballPath)) {
  console.error(
    `write-release-evidence: tarball not found at ${tarballPath}. ` +
      `Run 'npm pack' (or set TARBALL_PATH) before generating evidence.`,
  );
  process.exit(1);
}
const tarballSha = sha256(readFileSync(tarballPath));
if (tarballSha === ZERO_SHA) {
  console.error("write-release-evidence: tarball SHA-256 hashed to all zeros; refusing to write.");
  process.exit(1);
}

const outDir = join(sdkRoot, "docs", "verification");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `v${version}.md`);

const body = `# v${version} Verification

Date: ${today}
Package: \`pumble-sdk@${version}\`
Commit: \`${commit}\`
CI run: ${ciRun}
Release run: ${releaseRun}
npm: ${npmUrl}
Provenance: ${provenance}
Tarball SHA-256: \`${tarballSha}\`
Live smoke artifact: \`${smokeArtifact}\`

## Gates

${renderGateTable()}

## Known Limitations

- App/OAuth/socket helpers remain experimental (see G08).
- Documented generated-runtime patches still in place; see \`docs/patch-burndown.md\`.
`;

writeFileSync(outFile, body);
console.log(`wrote ${outFile}`);

function renderGateTable() {
  const gateStatus = env("GATE_STATUS_PATH")
    ? readJson(env("GATE_STATUS_PATH"))
    : null;
  const defaultGates = [
    "OpenAPI spec audit",
    "Build",
    "Lint",
    "Unit/docs tests",
    "Replay tests",
    "Fixture scan",
    "Pack smoke",
    "Facade live smoke",
    "Curated MCP live smoke",
  ];
  const rows = defaultGates.map((gate) => {
    const result = gateStatus?.[gate] ?? "unverified";
    return `| ${gate} | ${result} |`;
  });
  return ["| Gate | Result |", "| --- | --- |", ...rows].join("\n");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`write-release-evidence: failed to read gate status from ${path}: ${err.message}`);
    process.exit(1);
  }
}
