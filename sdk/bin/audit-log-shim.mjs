// Pass-through fetch audit logger. Counterpart to dry-run-shim.mjs —
// loaded into the MCP child process via Node's `--import` when
// `--audit-log <path>` is set without `--dry-run`. Every outbound
// HTTP request emits one JSONL event
// `{ts, method, url, status, durationMs, errorClass?}` to the
// configured file. The response is forwarded unchanged.
//
// Off by default; activated only when `PUMBLE_AUDIT_LOG=/path/to/file.jsonl`
// is set in the environment.

import { appendFile } from "node:fs/promises";

if (process.env.PUMBLE_AUDIT_LOG) {
  installAuditLogShim(process.env.PUMBLE_AUDIT_LOG);
}

function installAuditLogShim(path) {
  const realFetch = globalThis.fetch.bind(globalThis);
  const banner = (line) => process.stderr.write(`[pumble-audit] ${line}\n`);
  banner(`fetch audit active → ${path}`);

  let chain = Promise.resolve();
  let warned = false;
  const write = (event) => {
    const line = JSON.stringify(event) + "\n";
    chain = chain
      .then(() => appendFile(path, line, { encoding: "utf8" }))
      .catch((err) => {
        if (!warned) {
          warned = true;
          banner(`audit write failed: ${err?.message ?? err}`);
        }
      });
  };

  globalThis.fetch = async function auditedFetch(input, init) {
    const req = input instanceof Request
      ? new Request(input, init)
      : new Request(input, init);
    const method = req.method.toUpperCase();
    const url = req.url;
    const start = performance.now();
    const ts = new Date().toISOString();
    try {
      const res = await realFetch(req);
      const durationMs = Math.round(performance.now() - start);
      write({ ts, method, url, status: res.status, durationMs });
      return res;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      const errorClass = err instanceof Error ? err.constructor.name : "Unknown";
      const message = err instanceof Error ? err.message : String(err);
      write({ ts, method, url, status: null, durationMs, errorClass, message });
      throw err;
    }
  };
}
