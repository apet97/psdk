// Network-layer dry-run shim. Loaded into the MCP server via Node's
// `--import` flag from sdk/bin/pumble-mcp.mjs when `--dry-run` is set.
//
// Purpose: let an agent exercise EVERY MCP tool — including mutating
// ones — without touching the live workspace. The shim wraps
// `globalThis.fetch`, lets GET/HEAD through, and synthesises plausible
// 200-OK bodies for POST/PUT/PATCH/DELETE so the SDK's Zod schemas
// don't choke on the intercepted response.
//
// Off by default; activated by setting `PUMBLE_DRY_RUN=1` in the
// environment before this module is imported.
//
// JSONL audit: when `PUMBLE_DRY_RUN_LOG=/path/to/file.jsonl` is set,
// every intercepted call appends one JSON line
// `{ts, method, path, requestBody, syntheticBody}` to that file.
// Request bodies are sanitized before writing.

import { sanitizeAuditBody } from "../scripts/record-replay-common.mjs";
// Audit failures are swallowed (one stderr warning, then silent) so
// disk pressure can't break the synthetic happy path.

import { appendFile } from "node:fs/promises";

if (process.env.PUMBLE_DRY_RUN === "1") {
  installDryRunShim();
}

function installDryRunShim() {
  const realFetch = globalThis.fetch.bind(globalThis);
  const banner = (line) => process.stderr.write(`[pumble-dry-run] ${line}\n`);
  banner("network shim active — POST/PUT/PATCH/DELETE will be intercepted");

  const auditPath = process.env.PUMBLE_DRY_RUN_LOG ?? null;
  const audit = createAuditWriter(auditPath, banner);
  if (auditPath) banner(`audit log: appending JSONL to ${auditPath}`);

  globalThis.fetch = async function dryRunFetch(input, init) {
    // Normalise the (input, init) couple into a single Request so we
    // can read URL + method consistently regardless of which form the
    // caller used.
    const req = input instanceof Request
      ? new Request(input, init)
      : new Request(input, init);
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return realFetch(req);
    }

    let path;
    try {
      path = new URL(req.url).pathname;
    } catch {
      path = req.url;
    }

    const body = synthesise(path, method);
    banner(`${method} ${path} → synthesised 200 (body: ${truncate(JSON.stringify(body), 120)})`);

    if (audit) {
      // Reading the body consumes it, so clone first. Best-effort JSON
      // parse — fall back to raw text for non-JSON requests.
      let requestBody = null;
      try {
        const text = await req.clone().text();
        if (text.length > 0) {
          try { requestBody = JSON.parse(text); } catch { requestBody = text; }
        }
      } catch {
        requestBody = null;
      }
      audit.write({
        ts: new Date().toISOString(),
        method,
        path,
        requestBody: sanitizeAuditBody(requestBody),
        syntheticBody: body,
      });
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

function createAuditWriter(path, banner) {
  if (!path) return null;
  let chain = Promise.resolve();
  let warned = false;
  globalThis.__PUMBLE_DRY_RUN_FLUSH__ = () => chain;
  return {
    write(event) {
      const line = JSON.stringify(event) + "\n";
      chain = chain
        .then(() => appendFile(path, line, { encoding: "utf8" }))
        .catch((err) => {
          if (!warned) {
            warned = true;
            banner(`audit write failed (${path}): ${err?.message ?? err}`);
          }
        });
    },
    flush() {
      return chain;
    },
  };
}

function truncate(s, n) {
  if (typeof s !== "string") return String(s);
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// Endpoint → synthetic-body table. Keys are matched on path suffix so
// we tolerate base-URL variation. Values are picked to satisfy the
// SDK's Zod response schemas where reasonable; for paths we don't
// know, we fall back to `{ status: "ok" }` which validates for the
// reaction/edit/delete ack endpoints.
const SYNTHETIC_ID_CHANNEL = "bbbbbbbbbbbbbbbbbbbb0099";
const SYNTHETIC_ID_MESSAGE = "cccccccccccccccccccc0099";
const SYNTHETIC_ID_SCHED = "dddddddddddddddddddd0099";
const SYNTHETIC_ID_WORKSPACE = "aaaaaaaaaaaaaaaaaaaa0000";
const SYNTHETIC_ID_USER = "aaaaaaaaaaaaaaaaaaaa0001";

const REF_MESSAGE = { id: SYNTHETIC_ID_MESSAGE, channelId: SYNTHETIC_ID_CHANNEL };
const REF_SCHEDULED = { id: SYNTHETIC_ID_SCHED, channelId: SYNTHETIC_ID_CHANNEL };
const REF_CHANNEL = { id: SYNTHETIC_ID_CHANNEL, name: "dry-run-channel" };
const ACK_OK = { status: "ok" };

const FULL_SCHEDULED = {
  id: SYNTHETIC_ID_SCHED,
  channelId: SYNTHETIC_ID_CHANNEL,
  workspaceId: SYNTHETIC_ID_WORKSPACE,
  author: SYNTHETIC_ID_USER,
  text: "[dry-run] synthetic scheduled message",
  sendAt: Date.now() + 60 * 60 * 1000,
  blocks: [],
};

function synthesise(path, method) {
  // Pumble paths are short and unique; matching on suffix keeps the
  // table small.
  if (path.endsWith("/sendMessage")) return REF_MESSAGE;
  if (path.endsWith("/sendReply")) return REF_MESSAGE;
  if (path.endsWith("/dmUser")) return REF_MESSAGE;
  if (path.endsWith("/dmGroup")) return REF_MESSAGE;
  if (path.endsWith("/createChannel")) return REF_CHANNEL;
  if (path.endsWith("/addUsersToChannel")) return ACK_OK;
  if (path.endsWith("/removeUserFromChannel")) return ACK_OK;
  if (path.endsWith("/addReaction")) return ACK_OK;
  if (path.endsWith("/removeReaction")) return ACK_OK;
  if (path.endsWith("/editMessage")) return ACK_OK;
  if (path.endsWith("/deleteMessage")) return ACK_OK;
  if (path.endsWith("/customStatus")) return ACK_OK;
  if (path.endsWith("/createScheduledMessage")) return REF_SCHEDULED;
  if (path.endsWith("/editScheduledMessage")) return FULL_SCHEDULED;
  if (path.endsWith("/deleteScheduledMessage")) return ACK_OK;
  // Unknown mutation — return ack and let the SDK's validation tell us
  // if we missed something.
  void method;
  return ACK_OK;
}
