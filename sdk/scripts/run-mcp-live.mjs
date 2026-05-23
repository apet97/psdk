#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createPumbleClient } from "../esm/extensions/index.js";
import { requireLiveApiKey } from "./live-env.mjs";
import { CURATED_TOOL_NAMES } from "../esm/mcp-server/curated/tools.js";
import { createLiveSmokeHarness } from "./live-smoke-harness.mjs";
import { redactLiveValue } from "./live-smoke-utils.mjs";

const { apiKeyAuth, env } = requireLiveApiKey();
const raw = createPumbleClient({ apiKeyAuth, resolverCache: true }).raw;
const smoke = createLiveSmokeHarness({ finalSummary: "Curated MCP live smoke passed." });
const runId = `sdk-mcp-live-${Date.now()}`;
const channelName = runId.toLowerCase();
const client = new Client({ name: "pumble-sdk-live-smoke", version: "0.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["./bin/pumble-mcp-curated.mjs", "start", "--api-key-auth", apiKeyAuth],
  cwd: new URL("..", import.meta.url).pathname,
  env: safeChildEnv(env),
  stderr: "pipe",
});

function safeChildEnv(env) {
  const safe = { PATH: env.PATH ?? process.env.PATH ?? "", HOME: env.HOME ?? process.env.HOME ?? "" };
  if (env.NODE_EXTRA_CA_CERTS) safe.NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
  return safe;
}

function assertEnvelope(name, payload) {
  if (payload?.ok !== true) {
    throw new Error(`${name} returned non-ok payload: ${JSON.stringify(redactLiveValue(payload))}`);
  }
  for (const key of ["summary", "ids", "data", "nextActions"]) {
    if (!(key in payload)) throw new Error(`${name} missing ${key}`);
  }
  if (!Array.isArray(payload.nextActions)) throw new Error(`${name} nextActions is not an array`);
  return payload;
}

function parseToolPayload(result) {
  if (result.isError) {
    throw new Error(`MCP tool returned error: ${JSON.stringify(redactLiveValue(result.content))}`);
  }
  const [content] = result.content ?? [];
  if (content?.type !== "text") throw new Error("MCP tool did not return text content");
  return JSON.parse(content.text);
}

async function call(name, args = {}) {
  return smoke.run(`mcp.${name}`, args, async () =>
    parseToolPayload(await client.callTool({ name, arguments: args })));
}

async function cleanup() {
  await smoke.cleanup((item) => raw.messages.deleteMessage(item));
  await client.close().catch(() => {});
  await transport.close().catch(() => {});
}

try {
  await smoke.run("mcp.connect", {}, () => client.connect(transport));
  const listed = await smoke.run("mcp.listTools", {}, () => client.listTools());
  const names = listed.tools.map((tool) => tool.name).sort();
  const expected = [...CURATED_TOOL_NAMES].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected curated tool list: ${names.join(", ")}`);
  }
  if (names.some((name) => /^(messages|channels|users)-/.test(name))) {
    throw new Error("Curated tools/list exposed raw generated tool names");
  }

  assertEnvelope("whoami", await call("whoami"));
  await smoke.run("channels.create", { channel: channelName }, () =>
    raw.channels.createChannel({
    name: channelName,
    type: "PUBLIC",
    description: "Created by pumble-sdk curated MCP live smoke.",
  }));

  const preview = assertEnvelope("send_message_preview", await call("send_message_preview", {
    channel: channelName,
    text: `mcp live smoke ${runId}`,
  }));
  const sent = assertEnvelope("send_message_confirmed", await call(
    "send_message_confirmed",
    preview.data,
  ));
  smoke.trackMessage({ channelId: sent.ids.channelId, messageId: sent.ids.messageId });

  const replyPreview = assertEnvelope("reply_to_thread_preview", await call("reply_to_thread_preview", {
    channel: channelName,
    messageId: sent.ids.messageId,
    text: `mcp live smoke reply ${runId}`,
  }));
  const reply = assertEnvelope("reply_to_thread_confirmed", await call(
    "reply_to_thread_confirmed",
    replyPreview.data,
  ));
  smoke.trackMessage({ channelId: reply.ids.channelId, messageId: reply.ids.messageId });

  smoke.printSuccess({
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    replyId: reply.ids.messageId,
  });
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
}
