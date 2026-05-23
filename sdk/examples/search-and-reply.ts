import { createPumbleClient } from "pumble-sdk/extensions/index.js";

export const searchAndReplyRequiredEnv = ["PUMBLE_API_KEY"];

export interface SearchAndReplyConfig {
  apiKeyAuth: string;
  query: string;
  replyText: string;
}

export interface SearchAndReplyClient {
  search: {
    recent(request: { query: string; limit: number }): Promise<{ ok: true; data: SearchHit[] }>;
  };
  threads: {
    reply(request: { channelId: string; messageId: string; text: string }): Promise<unknown>;
  };
}

interface SearchHit {
  id: string;
  channelId: string;
  threadReplyInfo?: { rootId?: string | undefined } | undefined;
}

export function readSearchAndReplyConfig(
  env: NodeJS.ProcessEnv = process.env,
): SearchAndReplyConfig {
  const apiKeyAuth = env["PUMBLE_API_KEY"];
  if (!apiKeyAuth) throw new Error("PUMBLE_API_KEY is required");
  return {
    apiKeyAuth,
    query: (env["PUMBLE_SEARCH_QUERY"] ?? "release").trim(),
    replyText: (env["PUMBLE_REPLY_TEXT"] ?? "Thanks, following up here.").trim(),
  };
}

export async function searchAndReply(
  client: SearchAndReplyClient,
  config: Pick<SearchAndReplyConfig, "query" | "replyText">,
) {
  const search = await client.search.recent({ query: config.query, limit: 1 });
  const [hit] = search.data;
  if (!hit) {
    return { ok: false, summary: `No recent messages for ${config.query}.`, search };
  }
  const reply = await client.threads.reply({
    channelId: hit.channelId,
    messageId: hit.threadReplyInfo?.rootId ?? hit.id,
    text: config.replyText,
  });
  return { ok: true, search, reply };
}

function isDirectRun(metaUrl: string): boolean {
  return process.argv[1] !== undefined && import.meta.url === metaUrl
    && metaUrl === new URL(`file://${process.argv[1]}`).href;
}

if (isDirectRun(import.meta.url)) {
  const { apiKeyAuth, ...config } = readSearchAndReplyConfig();
  const client = createPumbleClient({ apiKeyAuth });
  const result = await searchAndReply(client, config);
  console.log(JSON.stringify(result, null, 2));
}
