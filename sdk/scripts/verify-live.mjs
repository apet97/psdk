#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const DEFAULT_ENV_FILE = "/tmp/pumble-livetest.env";
const envFile = process.env.PUMBLE_LIVE_ENV_FILE ?? DEFAULT_ENV_FILE;

function parseEnvFile(path) {
  const env = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const assignment = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equals = assignment.indexOf("=");
    if (equals === -1) continue;

    const key = assignment.slice(0, equals).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = assignment.slice(equals + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const liveEnv = { ...process.env };
if (!liveEnv.PUMBLE_API_KEY && existsSync(envFile)) {
  Object.assign(liveEnv, parseEnvFile(envFile));
}

if (!liveEnv.PUMBLE_API_KEY) {
  console.log(`verify:live skipped: set PUMBLE_API_KEY or create ${envFile}`);
  process.exit(0);
}

for (const args of [["run", "test:arazzo"], ["run", "test:live"]]) {
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
