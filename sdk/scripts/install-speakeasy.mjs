#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INSTALLER_URL = "https://go.speakeasy.com/cli-install.sh";
const INSTALLER_SHA256 = process.env.SPEAKEASY_INSTALLER_SHA256
  ?? "9e2c4f1054e214d05352597cfd9ed1ab117a089e9442f532dd4a0d168665d757";

const response = await fetch(INSTALLER_URL);
if (!response.ok) {
  throw new Error(`Speakeasy installer download failed: ${response.status} ${response.statusText}`);
}

const installer = Buffer.from(await response.arrayBuffer());
const actual = createHash("sha256").update(installer).digest("hex");
if (actual !== INSTALLER_SHA256) {
  throw new Error(`Speakeasy installer checksum mismatch: expected ${INSTALLER_SHA256}, got ${actual}`);
}

const dir = mkdtempSync(join(tmpdir(), "speakeasy-install-"));
const installerPath = join(dir, "cli-install.sh");
writeFileSync(installerPath, installer, { mode: 0o700 });

const result = spawnSync("sh", [installerPath], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) throw result.error;
if (result.signal) {
  console.error(`Speakeasy installer terminated by ${result.signal}`);
  process.exit(1);
}
process.exit(result.status ?? 0);
