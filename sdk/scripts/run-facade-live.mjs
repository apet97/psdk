#!/usr/bin/env node
import { createPumbleClient } from "../esm/extensions/index.js";
import { requireLiveApiKey } from "./live-env.mjs";
import {
  redactLiveValue,
  runLiveOperation,
  runSearchSmoke,
  selectDmRecipient,
} from "./live-smoke-utils.mjs";

const { apiKeyAuth } = requireLiveApiKey();
const client = createPumbleClient({ apiKeyAuth, resolverCache: true });
const runId = `sdk-facade-live-${Date.now()}`;
const channelName = runId.toLowerCase();
const text = `facade smoke ${runId}`;
const created = { channelId: undefined, messageIds: [] };

function assertOk(name, value) {
  if (!value?.ok) {
    throw new Error(`${name} failed: ${
      value?.summary
        ? redactLiveValue(value.summary)
        : JSON.stringify(redactLiveValue(value))
    }`);
  }
  return value;
}

async function assertMessageReadable(name, { channelId, messageId, text }) {
  const fetched = await runLiveOperation(name, { channelId, messageId }, () =>
    client.messages.fetch({ channelId, messageId }));
  if (fetched?.id !== messageId) {
    throw new Error(`${name} returned an unexpected message id`);
  }
  if (text !== undefined && fetched?.text !== text) {
    throw new Error(`${name} returned an unexpected message body`);
  }
  return fetched;
}

async function cleanup() {
  for (const item of created.messageIds.reverse()) {
    try {
      await client.raw.messages.deleteMessage(item);
    } catch {
      // Best-effort cleanup only: live smoke should report the original failure.
    }
  }
}

try {
  const me = await runLiveOperation("identity.me", {}, () => client.identity.me());
  if (!me?.id || !me?.email) throw new Error("identity.me returned no id/email");

  assertOk("users.find", await runLiveOperation("users.find", { email: me.email }, () =>
    client.users.find(me.email)));

  const channel = await runLiveOperation("channels.create", { channel: channelName }, () =>
    client.raw.channels.createChannel({
    name: channelName,
    type: "PUBLIC",
    description: "Created by pumble-sdk facade live smoke.",
  }));
  created.channelId = channel.id;
  await runLiveOperation("resolvers.refresh", {}, () => client.resolvers.refresh());

  const foundChannel = assertOk("channels.find", await runLiveOperation(
    "channels.find",
    { channel: channelName },
    () => client.channels.find(channelName),
  ));
  const sent = assertOk("messages.send", await runLiveOperation(
    "messages.send",
    { channel: foundChannel.ids.channelId },
    () => client.messages.send({
    channel: channelName,
    text,
  }),
  ));
  created.messageIds.push({ channelId: sent.ids.channelId, messageId: sent.ids.messageId });
  await assertMessageReadable("messages.fetch.sent", {
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    text,
  });

  await runSearchSmoke({
    searchRecent: (request) =>
      runLiveOperation("search.recent", { query: request.query }, () => client.search.recent(request)),
    query: runId,
  });

  const replyText = `facade smoke reply ${runId}`;
  const reply = assertOk("threads.reply", await runLiveOperation(
    "threads.reply",
    { channelId: sent.ids.channelId, messageId: sent.ids.messageId },
    () => client.threads.reply({
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    text: replyText,
  }),
  ));
  created.messageIds.push({ channelId: reply.ids.channelId, messageId: reply.ids.messageId });
  await assertMessageReadable("messages.fetch.reply", {
    channelId: reply.ids.channelId,
    messageId: reply.ids.messageId,
    text: replyText,
  });

  const users = await runLiveOperation("users.list", {}, () => client.users.list());
  const recipient = selectDmRecipient(users, me.id);
  if (!recipient) throw new Error("No non-self user available for DM smoke");
  const dm = assertOk("messages.dm", await runLiveOperation(
    "messages.dm",
    { userId: recipient.id },
    () => client.messages.dm({
    user: recipient.email,
    text: `facade smoke dm ${runId}`,
  }),
  ));
  created.messageIds.push({ channelId: dm.ids.channelId, messageId: dm.ids.messageId });

  console.log(JSON.stringify({
    ok: true,
    summary: "Facade live smoke passed.",
    ids: {
      channelId: "<redacted>",
      messageId: "<redacted>",
      replyId: "<redacted>",
      dmMessageId: "<redacted>",
    },
  }));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
}
