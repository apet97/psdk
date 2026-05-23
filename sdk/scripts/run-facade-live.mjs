#!/usr/bin/env node
import { createPumbleClient } from "../esm/extensions/index.js";
import { requireLiveApiKey } from "./live-env.mjs";
import { runSearchSmoke, selectDmRecipient } from "./live-smoke-utils.mjs";

const { apiKeyAuth } = requireLiveApiKey();
const client = createPumbleClient({ apiKeyAuth, resolverCache: true });
const runId = `sdk-facade-live-${Date.now()}`;
const channelName = runId.toLowerCase();
const text = `facade smoke ${runId}`;
const created = { channelId: undefined, messageIds: [] };

function assertOk(name, value) {
  if (!value?.ok) {
    throw new Error(`${name} failed: ${value?.summary ?? JSON.stringify(value)}`);
  }
  return value;
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
  const me = await client.identity.me();
  if (!me?.id || !me?.email) throw new Error("identity.me returned no id/email");

  assertOk("users.find", await client.users.find(me.email));

  const channel = await client.raw.channels.createChannel({
    name: channelName,
    type: "PUBLIC",
    description: "Created by pumble-sdk facade live smoke.",
  });
  created.channelId = channel.id;
  await client.resolvers.refresh();

  const foundChannel = assertOk("channels.find", await client.channels.find(channelName));
  const sent = assertOk("messages.send", await client.messages.send({
    channel: channelName,
    text,
  }));
  created.messageIds.push({ channelId: sent.ids.channelId, messageId: sent.ids.messageId });

  await runSearchSmoke({
    searchRecent: (request) => client.search.recent(request),
    query: runId,
  });

  const reply = assertOk("threads.reply", await client.threads.reply({
    channelId: sent.ids.channelId,
    messageId: sent.ids.messageId,
    text: `facade smoke reply ${runId}`,
  }));
  created.messageIds.push({ channelId: reply.ids.channelId, messageId: reply.ids.messageId });

  const users = await client.users.list();
  const recipient = selectDmRecipient(users, me.id);
  if (!recipient) throw new Error("No non-self user available for DM smoke");
  const dm = assertOk("messages.dm", await client.messages.dm({
    user: recipient.email,
    text: `facade smoke dm ${runId}`,
  }));
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
} finally {
  await cleanup();
}
