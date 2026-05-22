import "dotenv/config";
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const apiKeyAuth = process.env["PUMBLE_API_KEY"];
const query = process.env["PUMBLE_SEARCH_QUERY"] ?? "release";
const replyText = process.env["PUMBLE_REPLY_TEXT"] ?? "Thanks, following up here.";

if (!apiKeyAuth) {
  throw new Error("PUMBLE_API_KEY is required");
}

const client = createPumbleClient({ apiKeyAuth });
const search = await client.search.recent({ query, limit: 1 });
const [hit] = search.data;

if (!hit) {
  console.log(JSON.stringify({ ok: false, summary: `No recent messages for ${query}.` }, null, 2));
} else {
  const rootMessageId = hit.threadReplyInfo?.rootId ?? hit.id;
  const reply = await client.threads.reply({
    channelId: hit.channelId,
    messageId: rootMessageId,
    text: replyText,
  });
  console.log(JSON.stringify({ search, reply }, null, 2));
}
