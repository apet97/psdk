#!/usr/bin/env node
// Free-tier replacement for `speakeasy test`. Parses
// .speakeasy/tests.arazzo.yaml and executes each workflow's step against
// the live Pumble workspace using the generated SDK, then applies the
// arazzo successCriteria (status code + JSONPath checks).
//
// Run:  source /tmp/pumble-livetest.env && node scripts/run-arazzo-live.mjs
// Replay: node scripts/run-arazzo-live.mjs --replay arazzo-26-workflows
//
// Bootstraps a sdk-livetest channel + anchor message + anchor scheduled
// message, then substitutes those live IDs in for the placeholder hex
// values in the arazzo. Cleans up its anchor resources on exit (best
// effort — won't fight a failing API). Writes to the sacrificial
// workspace only; safe to re-run.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { query as jpQuery } from "jsonpath-rfc9535";
import { PumbleSDK } from "../esm/index.js";
import { formatArazzoContextSummary } from "./record-replay-common.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARAZZO_PATH = resolve(__dirname, "../.speakeasy/tests.arazzo.yaml");

function readReplayArg(argv) {
  const idx = argv.indexOf("--replay");
  if (idx === -1) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) {
    console.error("--replay requires a fixture name");
    process.exit(2);
  }
  argv.splice(idx, 2);
  return value;
}

const argv = process.argv.slice(2);
const replayName = readReplayArg(argv) ?? process.env.PUMBLE_REPLAY ?? null;
const recordName = process.env.PUMBLE_RECORD ?? null;
if (replayName && recordName) {
  console.error("PUMBLE_RECORD and PUMBLE_REPLAY/--replay are mutually exclusive");
  process.exit(2);
}
if (argv.length > 0) {
  console.error(`Unknown argument(s): ${argv.join(" ")}`);
  process.exit(2);
}
if (replayName) {
  process.env.PUMBLE_REPLAY = replayName;
  await import("./replayer.mjs");
} else if (recordName) {
  await import("./recorder.mjs");
}

const KEY = process.env.PUMBLE_API_KEY ?? (replayName ? "replay-api-key" : undefined);
if (!KEY) {
  console.error("PUMBLE_API_KEY not set — source /tmp/pumble-livetest.env first");
  process.exit(2);
}

const sdk = new PumbleSDK({ apiKeyAuth: KEY });

const colours = {
  ok: "\x1b[32m",
  fail: "\x1b[31m",
  warn: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};
const paint = (c, s) => `${colours[c]}${s}${colours.reset}`;

// -------------------------------------------------------------------------
// Bootstrap: produce live IDs to substitute for placeholder hex values.
// -------------------------------------------------------------------------
async function bootstrap() {
  const me = await sdk.users.myInfo();
  const channels = await sdk.channels.listChannels();

  // Reuse the smoke-test channel if present; otherwise mint a fresh one
  // dedicated to this runner so we don't fight the smoke test.
  let testChannel = channels.find(
    (e) => e.channel.name?.startsWith("sdk-livetest-arazzo-"),
  )?.channel;
  let createdChannel = false;
  if (!testChannel) {
    testChannel = (await sdk.channels.createChannel({
      name: `sdk-livetest-arazzo-${Date.now()}`,
      type: "PUBLIC",
    }));
    createdChannel = true;
  }

  // Find two distinct non-self, non-bot, ACTIVATED users so dmGroup has
  // valid participants. Pumble rejects dmGroup with `Provided participants
  // are not valid` when the userIds aren't real active workspace members.
  const users = await sdk.users.listUsers();
  const dmable = users.filter(
    (u) =>
      u.id !== me.id &&
      u.status === "ACTIVATED" &&
      !u.isPumbleBot &&
      !u.isAddonBot &&
      u.role !== "GUEST",
  );
  const user2 = dmable[0]?.id ?? me.id;
  const user3 = dmable[1]?.id ?? user2;

  // Anchor message + scheduled message. These persist throughout the run
  // so workflows that reference them (fetchMessage, addReaction,
  // editScheduledMessage, ...) have something real to point at.
  const anchorMsg = await sdk.messages.sendMessage({
    channelId: testChannel.id,
    text: "arazzo runner anchor — safe to delete",
  });
  const anchorSched = await sdk.scheduledMessages.createScheduledMessage({
    channelId: testChannel.id,
    text: "arazzo runner anchor scheduled — safe to delete",
    sendAt: Date.now() + 60 * 60 * 1000,
  });

  return {
    self: me.id,
    workspace: me.workspaceId,
    user2,
    user3,
    channel: testChannel.id,
    message: anchorMsg.id,
    scheduled: anchorSched.id,
    _runId: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    _createdChannel: createdChannel,
    _channelName: testChannel.name,
  };
}

// -------------------------------------------------------------------------
// Placeholder → live-ID mapping. Mirrors the genericized YAML examples.
// -------------------------------------------------------------------------
const PLACEHOLDERS = {
  aaaaaaaaaaaaaaaaaaaa0000: "workspace",
  aaaaaaaaaaaaaaaaaaaa0001: "self",
  aaaaaaaaaaaaaaaaaaaa0002: "user2",
  aaaaaaaaaaaaaaaaaaaa0003: "user3",
  bbbbbbbbbbbbbbbbbbbb0001: "channel",
  bbbbbbbbbbbbbbbbbbbb0002: "channel",
  cccccccccccccccccccc0001: "message",
  dddddddddddddddddddd0001: "scheduled",
};

function substitute(value, ctx, parentKey) {
  if (typeof value === "string") {
    if (PLACEHOLDERS[value]) return ctx[PLACEHOLDERS[value]];
    // Channel/user-group names must be globally unique within the
    // workspace, so any literal example name gets suffixed per-run.
    // Without this the second createChannel workflow run returns 403
    // "This channel name is already taken".
    if (parentKey === "name" && /^sdk-livetest/.test(value)) {
      return `${value}-${ctx._runId}`;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, ctx));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = substitute(v, ctx, k);
    return out;
  }
  return value;
}

// -------------------------------------------------------------------------
// operationId → SDK method dispatcher. Each handler receives the merged
// request object (parameters + body) and returns either the response
// body or a PageIterator (which we unwrap to its `.result`).
// -------------------------------------------------------------------------
const dispatch = {
  myInfo: () => sdk.users.myInfo(),
  listUsers: () => sdk.users.listUsers(),
  listUserGroups: () => sdk.users.listUserGroups(),
  listChannels: () => sdk.channels.listChannels(),
  getChannel: (r) => sdk.channels.getChannel(r),
  createChannel: (r) => sdk.channels.createChannel(r),
  sendMessage: (r) => sdk.messages.sendMessage(r),
  sendReply: (r) => sdk.messages.sendReply(r),
  dmUser: (r) => sdk.messages.dmUser(r),
  dmGroup: (r) => sdk.messages.dmGroup(r),
  fetchMessage: (r) => sdk.messages.fetchMessage(r),
  fetchThreadReplies: (r) => sdk.messages.fetchThreadReplies(r),
  listMessages: (r) => sdk.messages.listMessages(r),
  searchMessages: (r) => sdk.messages.searchMessages(r),
  addReaction: (r) => sdk.messages.addReaction(r),
  removeReaction: (r) => sdk.messages.removeReaction(r),
  createScheduledMessage: (r) => sdk.scheduledMessages.createScheduledMessage(r),
  fetchScheduledMessages: (r) => sdk.scheduledMessages.fetchScheduledMessages(r),
  fetchScheduledMessage: (r) => sdk.scheduledMessages.fetchScheduledMessage(r),
  editScheduledMessage: (r) => sdk.scheduledMessages.editScheduledMessage(r),
  editMessage: (r) => sdk.messages.editMessage(r),
  deleteMessage: (r) => sdk.messages.deleteMessage(r),
  deleteScheduledMessage: (r) => sdk.scheduledMessages.deleteScheduledMessage(r),
  addUsersToChannel: (r) => sdk.channels.addUsersToChannel(r),
  removeUserFromChannel: (r) => sdk.channels.removeUserFromChannel(r),
  customStatus: (r) => sdk.users.customStatus(r),
};

// -------------------------------------------------------------------------
// JSONPath evaluator. The successCriteria use a tiny subset of JSONPath:
// "$" (root exists), "$.field", "$.nested.field", or array indexing.
// jsonpath-rfc9535's `query` returns an array of matches; we treat any
// non-empty match as truthy.
// -------------------------------------------------------------------------
function jsonpathMatches(body, path) {
  if (path === "$") return body !== undefined && body !== null;
  if (body === undefined || body === null) return false;
  try {
    // jsonpath-rfc9535 expects a plain JSON value; SDKs return parsed
    // objects (with Date instances etc.) so re-serialise defensively.
    const normalised = JSON.parse(JSON.stringify(body));
    const matches = jpQuery(normalised, path);
    return Array.isArray(matches) ? matches.length > 0 : !!matches;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------------------
// Workflow runner.
// -------------------------------------------------------------------------
async function runWorkflow(wf, ctx) {
  const step = wf.steps?.[0];
  if (!step) return { ok: false, reason: "no step" };

  const opId = step.operationId;
  const handler = dispatch[opId];
  if (!handler) return { ok: false, reason: `no dispatcher for ${opId}` };

  // Merge declared parameters (path/query) + requestBody.payload (body).
  // The SDK's request shape is flat — parameters and body share keys.
  const params = {};
  for (const p of step.parameters ?? []) {
    params[p.name] = substitute(p.value, ctx);
  }
  const body = step.requestBody?.payload
    ? substitute(step.requestBody.payload, ctx)
    : {};
  const reqObj = { ...params, ...body };

  let status = 0;
  let resultBody;
  let thrownError;
  try {
    const res = await handler(reqObj);
    status = 200;
    // PageIterator response shape: { result, ...iterable }
    resultBody = res && typeof res === "object" && "result" in res ? res.result : res;
  } catch (e) {
    thrownError = e;
    status = typeof e?.statusCode === "number" ? e.statusCode : 0;
    // Try to surface the body in case JSONPath wants to inspect it.
    if (e?.data$) resultBody = e.data$;
    else if (typeof e?.body === "string") {
      try { resultBody = JSON.parse(e.body); } catch { resultBody = e.body; }
    }
  }

  const failures = [];
  for (const crit of step.successCriteria ?? []) {
    if (crit.context === "$response.body" && crit.type === "jsonpath") {
      if (!jsonpathMatches(resultBody, crit.condition)) {
        failures.push(`body jsonpath '${crit.condition}' matched none`);
      }
      continue;
    }
    if (typeof crit.condition === "string") {
      const m = crit.condition.match(/^\$statusCode\s*==\s*(\d+)$/);
      if (m) {
        const expected = Number(m[1]);
        if (status !== expected) failures.push(`status ${status} != ${expected}`);
        continue;
      }
      if (crit.condition.startsWith("$response.header.Content-Type")) {
        // SDK only returns JSON-parsed bodies; content-type check is implicit.
        continue;
      }
      failures.push(`unhandled criterion: ${crit.condition}`);
    }
  }

  return {
    ok: failures.length === 0,
    status,
    failures,
    errorName: thrownError?.constructor?.name,
    errorMsg: thrownError?.message,
  };
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
const arazzoRaw = readFileSync(ARAZZO_PATH, "utf8");
const arazzo = parseYaml(arazzoRaw);

console.log(paint("bold", `arazzo-live runner — ${arazzo.workflows.length} workflows`));
console.log(paint("dim", `spec: ${ARAZZO_PATH}`));
if (replayName) console.log(paint("dim", `mode: replay (${replayName})`));
if (recordName) console.log(paint("dim", `mode: record (${recordName})`));

function replayContext() {
  const meta = globalThis.__PUMBLE_REPLAY_META__;
  const ctx = meta?.get?.("arazzo-context");
  if (!ctx) {
    throw new Error("Replay fixture is missing required meta line: arazzo-context");
  }
  return ctx;
}

const ctx = replayName ? replayContext() : await bootstrap();
if (!replayName) {
  globalThis.__PUMBLE_RECORDER_WRITE_META__?.("arazzo-context", ctx);
  console.log(
    paint(
      "dim",
      `bootstrap: ${formatArazzoContextSummary(ctx, { redactValues: true })}`,
    ),
  );
} else {
  console.log(
    paint(
      "dim",
      `replay ctx: ${formatArazzoContextSummary(ctx, { redactValues: false })}`,
    ),
  );
}

const results = [];
for (const wf of arazzo.workflows) {
  let r;
  try {
    r = await runWorkflow(wf, ctx);
  } catch (e) {
    r = { ok: false, status: 0, failures: [String(e?.message ?? e)] };
  }
  results.push({ workflow: wf.workflowId, ...r });
  const sym = r.ok ? paint("ok", "✓") : paint("fail", "✗");
  const detail = r.ok
    ? paint("dim", `(status ${r.status})`)
    : paint("dim", `(${r.failures.join("; ")}${r.errorName ? ` [${r.errorName}]` : ""})`);
  console.log(`${sym} ${wf.workflowId.padEnd(28)} ${detail}`);
}

// -------------------------------------------------------------------------
// Cleanup
// -------------------------------------------------------------------------
const cleanup = async () => {
  // Delete the anchor scheduled message (may have been edited mid-run).
  try { await sdk.scheduledMessages.deleteScheduledMessage({ scheduledMessageId: ctx.scheduled }); } catch {}
  // Delete the anchor message + sweep any "arazzo" or "anchor" stragglers
  // we created during the run.
  try {
    const it = await sdk.messages.listMessages({ channelId: ctx.channel, limit: 50 });
    const list = it.result?.messages ?? [];
    let swept = 0;
    for (const m of list) {
      if (typeof m.text === "string" && (m.text.includes("arazzo") || m.text === "hello from arazzo" || m.text.includes("anchor"))) {
        try { await sdk.messages.deleteMessage({ messageId: m.id, channelId: ctx.channel }); swept++; } catch {}
      }
    }
    console.log(paint("dim", `cleanup: swept ${swept} arazzo messages`));
  } catch {
    /* best effort */
  }
};
if (replayName) {
  console.log(paint("dim", "cleanup: skipped in replay mode"));
} else {
  await cleanup();
}
await globalThis.__PUMBLE_RECORDER_FLUSH__?.();

// -------------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------------
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log("");
console.log(paint("bold", "=== summary ==="));
console.log(`${passed}/${results.length} workflows green${failed ? `, ${paint("fail", failed + " red")}` : ""}`);

if (failed > 0) {
  console.log("");
  console.log("Failed workflows:");
  for (const r of results.filter((x) => !x.ok)) {
    console.log(`  ${paint("fail", "✗")} ${r.workflow.padEnd(28)} status=${r.status} ${r.failures.join("; ")}${r.errorName ? ` [${r.errorName}: ${r.errorMsg ?? ""}]` : ""}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
