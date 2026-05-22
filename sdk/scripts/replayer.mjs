import { readFileSync } from "node:fs";
import { fixtureNameToPath, keyId, requestSnapshot } from "./record-replay-common.mjs";

let installed = false;

function loadFixture(name) {
  const fixturePath = fixtureNameToPath(name);
  const raw = readFileSync(fixturePath, "utf8");
  const entries = new Map();
  const meta = new Map();

  for (const [i, line] of raw.split(/\n/).entries()) {
    if (line.trim() === "") continue;
    const entry = JSON.parse(line);
    if (entry.type === "meta") {
      meta.set(entry.name, entry.value);
      continue;
    }
    if (entry.type !== "http" || !entry.key || !entry.response) {
      throw new Error(`Invalid replay fixture line ${i + 1} in ${fixturePath}`);
    }
    const id = keyId(entry.key);
    const bucket = entries.get(id) ?? [];
    bucket.push(entry);
    entries.set(id, bucket);
  }

  return { fixturePath, entries, meta };
}

export function installReplayer(name = process.env.PUMBLE_REPLAY) {
  if (installed || !name) return;
  installed = true;

  const { fixturePath, entries, meta } = loadFixture(name);
  globalThis.__PUMBLE_REPLAY_META__ = meta;

  globalThis.fetch = async (input, init) => {
    const snapshot = await requestSnapshot(input, init);
    const id = keyId(snapshot.key);
    const bucket = entries.get(id);
    if (!bucket || bucket.length === 0) {
      throw new Error(
        `PUMBLE_REPLAY miss for ${snapshot.key.method} ${snapshot.key.path} bodyHash=${snapshot.key.bodyHash}`,
      );
    }
    const entry = bucket.shift();
    return new Response(entry.response.body ?? "", {
      status: entry.response.status,
      statusText: entry.response.statusText,
      headers: entry.response.headers ?? {},
    });
  };

  console.error(`[pumble-replay] using fixture: ${fixturePath}`);
}

installReplayer();
