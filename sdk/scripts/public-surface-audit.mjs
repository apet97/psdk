#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");

const TIERS_FILE = resolve(sdkRoot, "docs", "STABILITY.md");
const TIERS = ["stable", "beta", "experimental", "internal"];

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function runSurfaceAudit() {
  const pkg = JSON.parse(readFileSync(resolve(sdkRoot, "package.json"), "utf8"));
  const stability = readFileSync(TIERS_FILE, "utf8");
  const readme = readFileSync(resolve(sdkRoot, "README.md"), "utf8");

  const exportPaths = Object.keys(pkg.exports ?? {}).filter(
    (entry) => entry !== "./package.json",
  );

  const missingTier = [];
  const tierMap = new Map();

  for (const ep of exportPaths) {
    const escaped = escapeRegex(ep);
    let matchedTier = null;
    for (const tier of TIERS) {
      const re = new RegExp(`\`${escaped}\`[^\\n]*\\b${tier}\\b`, "i");
      if (re.test(stability)) {
        matchedTier = tier;
        break;
      }
    }
    if (matchedTier === null) {
      missingTier.push(ep);
    } else {
      tierMap.set(ep, matchedTier);
    }
  }

  const headlineSection = readme.split(/^## /m)[1] ?? "";
  const experimentalLeaksInReadme = [];
  for (const [ep, tier] of tierMap) {
    if (tier === "experimental" && headlineSection.includes(ep)) {
      experimentalLeaksInReadme.push(ep);
    }
  }

  return { missingTier, experimentalLeaksInReadme, tiers: Object.fromEntries(tierMap) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runSurfaceAudit();
  let failed = 0;
  for (const [key, value] of Object.entries(report)) {
    if (Array.isArray(value) && value.length) {
      console.error(`${key}:`);
      for (const item of value) console.error(`  - ${item}`);
      failed += value.length;
    }
  }
  if (failed === 0) {
    console.log("public-surface-audit: ok");
  }
  process.exit(failed === 0 ? 0 : 1);
}
