#!/usr/bin/env node
import { resolve } from "node:path";
import {
  defaultFixtureDir,
  listFixtureFiles,
  scanFixtureFile,
} from "./replay-fixtures.mjs";

let failures = 0;
for (const fileName of listFixtureFiles(defaultFixtureDir)) {
  const path = resolve(defaultFixtureDir, fileName);
  for (const issue of scanFixtureFile(path, fileName)) {
    failures++;
    console.error(`${issue.fileName}:${issue.lineNumber}: ${issue.label}`);
  }
}

if (failures > 0) {
  console.error(`fixture scan failed: ${failures} issue(s)`);
  process.exit(1);
}

console.log("fixture scan passed");
