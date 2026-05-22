import { appendFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { fixtureNameToPath, headersToObject, requestSnapshot, sanitizeFixtureEntry } from "./record-replay-common.mjs";

let installed = false;
let writeChain = Promise.resolve();

function enqueue(path, entry) {
  writeChain = writeChain.then(() => appendFile(path, `${JSON.stringify(entry)}\n`));
  return writeChain;
}

export function installRecorder(name = process.env.PUMBLE_RECORD) {
  if (installed || !name) return;
  installed = true;

  const fixturePath = fixtureNameToPath(name);
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeChain = writeFile(fixturePath, "");

  const upstream = globalThis.fetch;
  if (typeof upstream !== "function") {
    throw new Error("PUMBLE_RECORD requested, but globalThis.fetch is not available");
  }

  globalThis.fetch = async (input, init) => {
    const snapshot = await requestSnapshot(input, init);
    const started = Date.now();
    const response = await upstream(snapshot.fetchRequest);
    const responseText = await response.clone().text();
    await enqueue(fixturePath, sanitizeFixtureEntry({
      type: "http",
      ts: new Date(started).toISOString(),
      key: snapshot.key,
      request: snapshot.request,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: headersToObject(response.headers),
        body: responseText,
      },
    }));
    return response;
  };

  globalThis.__PUMBLE_RECORDER_WRITE_META__ = (name, value) => {
    enqueue(fixturePath, sanitizeFixtureEntry({ type: "meta", name, value }));
  };
  globalThis.__PUMBLE_RECORDER_FLUSH__ = () => writeChain;
  console.error(`[pumble-record] writing fixture: ${fixturePath}`);
}

installRecorder();
