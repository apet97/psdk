import { fileURLToPath } from "node:url";
import {
  createPumbleClient,
  type PumbleClient,
  type ReplyToThreadRequest,
} from "pumble-keys-sdk/extensions/index.js";

export const replyToThreadRequiredEnv = [
  "PUMBLE_API_KEY",
  "PUMBLE_CHANNEL_ID",
  "PUMBLE_THREAD_ROOT_ID",
] as const;

export interface ReplyToThreadRecipeInput {
  readonly channelId: string;
  readonly rootMessageId?: string | undefined;
  readonly messageId?: string | undefined;
  readonly text: string;
  readonly alsoSendToChannel?: boolean | undefined;
}

export interface ReplyToThreadRecipeConfig {
  readonly apiKeyAuth: string;
  readonly request: ReplyToThreadRequest;
}

type Env = Record<string, string | undefined>;

function requireEnv(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function booleanEnv(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function buildReplyToThreadRequest(
  input: ReplyToThreadRecipeInput,
): ReplyToThreadRequest {
  const messageId = input.messageId ?? input.rootMessageId;
  if (messageId === undefined || messageId.trim().length === 0) {
    throw new Error("rootMessageId or messageId is required");
  }

  return {
    channelId: input.channelId.trim(),
    messageId: messageId.trim(),
    text: input.text.trim(),
    alsoSendToChannel: input.alsoSendToChannel ?? false,
  };
}

export function readReplyToThreadConfig(
  env: Env = process.env,
): ReplyToThreadRecipeConfig {
  return {
    apiKeyAuth: requireEnv(env, "PUMBLE_API_KEY"),
    request: buildReplyToThreadRequest({
      channelId: requireEnv(env, "PUMBLE_CHANNEL_ID"),
      rootMessageId: requireEnv(env, "PUMBLE_THREAD_ROOT_ID"),
      text: env["PUMBLE_REPLY_TEXT"]?.trim() || "Thanks for the context.",
      alsoSendToChannel: booleanEnv(env["PUMBLE_REPLY_TO_CHANNEL"]),
    }),
  };
}

export async function sendThreadReply(
  client: Pick<PumbleClient, "threads">,
  request: ReplyToThreadRequest,
) {
  return client.threads.replyToThread(request);
}

async function main(): Promise<void> {
  const config = readReplyToThreadConfig();
  const client = createPumbleClient({ apiKeyAuth: config.apiKeyAuth });
  const reply = await sendThreadReply(client, config.request);
  console.log(JSON.stringify({
    channelId: reply.channelId,
    messageId: reply.id,
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
