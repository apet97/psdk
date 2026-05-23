import { requestSnapshot } from "./record-replay-common.mjs";
import {
  createFixtureKeyId,
  formatReplayMiss,
  loadReplayFixture,
} from "./replay-fixtures.mjs";

let installed = false;

export function installReplayer(name = process.env.PUMBLE_REPLAY) {
  if (installed || !name) return;
  installed = true;

  const { fixturePath, entries, meta } = loadReplayFixture(name);
  globalThis.__PUMBLE_REPLAY_META__ = meta;

  globalThis.fetch = async (input, init) => {
    const snapshot = await requestSnapshot(input, init);
    const id = createFixtureKeyId(snapshot.key);
    const bucket = entries.get(id);
    if (!bucket || bucket.length === 0) {
      throw new Error(formatReplayMiss(snapshot.key));
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
