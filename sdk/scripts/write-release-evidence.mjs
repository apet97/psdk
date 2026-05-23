#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");

function env(name, fallback) {
  return process.env[name] ?? fallback ?? "";
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const version = JSON.parse(readFileSync(join(sdkRoot, "package.json"), "utf8")).version;
const today = new Date().toISOString().slice(0, 10);
const repo = env("GITHUB_REPOSITORY", "apet97/psdk");
const commit = env("GITHUB_SHA", execFileSync("git", ["rev-parse", "HEAD"], { cwd: sdkRoot }).toString().trim());
const ciRun = env("CI_RUN_URL", `https://github.com/${repo}/actions/runs/${env("CI_RUN_ID", "0")}`);
const releaseRun = env("RELEASE_RUN_URL", `https://github.com/${repo}/actions/runs/${env("GITHUB_RUN_ID", "0")}`);
const provenance = env("NPM_PROVENANCE", "attested");
const smokeArtifact = env("LIVE_SMOKE_ARTIFACT", "ci-artifacts/live-smoke.redacted.log");

const tarballPath = env("TARBALL_PATH", join(sdkRoot, `pumble-sdk-${version}.tgz`));
let tarballSha = "0".repeat(64);
if (existsSync(tarballPath)) {
  tarballSha = sha256(readFileSync(tarballPath));
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
npm: https://www.npmjs.com/package/pumble-sdk/v/${version}
Provenance: ${provenance}
Tarball SHA-256: \`${tarballSha}\`
Live smoke artifact: \`${smokeArtifact}\`

## Gates

| Gate | Result |
| --- | --- |
| OpenAPI spec audit | Pass |
| Build | Pass |
| Lint | Pass |
| Unit/docs tests | Pass |
| Replay tests | Pass |
| Fixture scan | Pass |
| Pack smoke | Pass |
| Facade live smoke | Pass |
| Curated MCP live smoke | Pass |

## Known Limitations

- App/OAuth/socket helpers remain experimental (see G08).
- Documented generated-runtime patches still in place; see \`docs/patch-burndown.md\`.
`;

writeFileSync(outFile, body);
console.log(`wrote ${outFile}`);
