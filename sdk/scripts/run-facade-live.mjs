#!/usr/bin/env node
import { createPumbleClient } from "../esm/extensions/index.js";
import { requireLiveApiKey } from "./live-env.mjs";
import { createLiveSmokeHarness } from "./live-smoke-harness.mjs";
import {
  redactLiveValue,
  runSearchSmoke,
  selectDmRecipient,
} from "./live-smoke-utils.mjs";

const { apiKeyAuth } = requireLiveApiKey();
const client = createPumbleClient({ apiKeyAuth, resolverCache: true });
const smoke = createLiveSmokeHarness({ finalSummary: "Facade live smoke passed." });
const runId = `sdk-facade-live-${Date.now()}`;
const channelName = runId.toLowerCase();
const text = `facade smoke ${runId}`;

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
  const fetched = await smoke.run(name, { channelId, messageId }, () =>
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
  await smoke.cleanup((item) => client.raw.messages.deleteMessage(item));
}

try {
  const me = await smoke.run("identity.me", {}, () => client.identity.me());
  if (!me?.id || !me?.email) throw new Error("identity.me returned no id/email");

  assertOk("users.find", await smoke.run("users.find", { email: me.email }, () =>
    client.users.find(me.email)));

  await smoke.run("channels.create", { channel: channelName }, () =>
    client.raw.channels.createChannel({
    name: channelName,
    type: "PUBLIC",
    description: "Created by pumble-keys-sdk facade live smoke.",
  }));
  await smoke.run("resolvers.refresh", {}, () => client.resolvers.refresh());

  const foundChannel = assertOk("channels.find", await smoke.run(
    "channels.find",
    { channel: channelName },
    () => client.channels.find(channelName),
  ));
  const sent = assertOk("messages.send", await smoke.run(
    "messages.send",
    { channel: foundChannel.ids.channelId },
    () => client.messages.send({
    channel: channelName,
    text,
  }),
  ));
  smoke.trackMessage({ channelId: sent.ids.channelId, messageId: sent.ids.messageId });
  await assertMessageReadable("messages.fetch.sent", {
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    text,
  });

  await runSearchSmoke({
    searchRecent: (request) =>
      smoke.run("search.recent", { query: request.query }, () => client.search.recent(request)),
    query: runId,
  });

  const replyText = `facade smoke reply ${runId}`;
  const reply = assertOk("threads.reply", await smoke.run(
    "threads.reply",
    { channelId: sent.ids.channelId, messageId: sent.ids.messageId },
    () => client.threads.reply({
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    text: replyText,
  }),
  ));
  smoke.trackMessage({ channelId: reply.ids.channelId, messageId: reply.ids.messageId });
  await assertMessageReadable("messages.fetch.reply", {
    channelId: reply.ids.channelId,
    messageId: reply.ids.messageId,
    text: replyText,
  });

  const users = await smoke.run("users.list", {}, () => client.users.list());
  const recipient = selectDmRecipient(users, me.id);
  if (!recipient) throw new Error("No non-self user available for DM smoke");
  const dm = assertOk("messages.dm", await smoke.run(
    "messages.dm",
    { userId: recipient.id },
    () => client.messages.dm({
    user: recipient.email,
    text: `facade smoke dm ${runId}`,
  }),
  ));
  smoke.trackMessage({ channelId: dm.ids.channelId, messageId: dm.ids.messageId });

  smoke.printSuccess({
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    replyId: reply.ids.messageId,
    dmMessageId: dm.ids.messageId,
  });
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
}
