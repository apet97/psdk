import { existsSync, readFileSync } from "node:fs";

export const DEFAULT_LIVE_ENV_FILE = "/tmp/pumble-livetest.env";

export function parseEnvFile(path) {
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

export function loadLiveEnv({
  env = process.env,
  envFile = env.PUMBLE_LIVE_ENV_FILE ?? DEFAULT_LIVE_ENV_FILE,
} = {}) {
  const liveEnv = { ...env };
  if (!liveEnv.PUMBLE_API_KEY && existsSync(envFile)) {
    Object.assign(liveEnv, parseEnvFile(envFile));
  }
  return { env: liveEnv, envFile };
}

export function requireLiveApiKey(options = {}) {
  const { env, envFile } = loadLiveEnv(options);
  if (!env.PUMBLE_API_KEY) {
    console.log(`live smoke skipped: set PUMBLE_API_KEY or create ${envFile}`);
    process.exit(0);
  }
  return { apiKeyAuth: env.PUMBLE_API_KEY, env, envFile };
}
