#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { loadLiveEnv } from "./live-env.mjs";

const { env: liveEnv, envFile } = loadLiveEnv();

if (!liveEnv.PUMBLE_API_KEY) {
  console.log(`verify:live skipped: set PUMBLE_API_KEY or create ${envFile}`);
  process.exit(0);
}

for (const args of [
  ["run", "build"],
  ["run", "test:arazzo"],
  ["run", "test:live"],
  ["run", "test:facade:live"],
  ["run", "test:mcp:live"],
]) {
  const result = spawnSync("npm", args, {
    env: liveEnv,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`npm ${args.join(" ")} terminated by ${result.signal}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
