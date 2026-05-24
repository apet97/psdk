import { createPumbleClient } from "pumble-keys-sdk/extensions/index.js";

export const sendChannelRequiredEnv = ["PUMBLE_API_KEY"];

export interface SendChannelConfig {
  apiKeyAuth: string;
  request: SendChannelRequest;
}

export interface SendChannelRequest {
  channel: string;
  text: string;
}

export interface SendChannelClient {
  messages: {
    send(request: SendChannelRequest): Promise<unknown>;
  };
}

export function buildSendChannelRequest(input: {
  channel?: string | undefined;
  text?: string | undefined;
}): SendChannelRequest {
  return {
    channel: (input.channel ?? "#general").trim(),
    text: (input.text ?? "Hello from pumble-keys-sdk.").trim(),
  };
}

export function readSendChannelConfig(env: NodeJS.ProcessEnv = process.env): SendChannelConfig {
  const apiKeyAuth = env["PUMBLE_API_KEY"];
  if (!apiKeyAuth) throw new Error("PUMBLE_API_KEY is required");
  return {
    apiKeyAuth,
    request: buildSendChannelRequest({
      channel: env["PUMBLE_CHANNEL"],
      text: env["PUMBLE_MESSAGE_TEXT"],
    }),
  };
}

export function sendChannelMessage(client: SendChannelClient, request: SendChannelRequest) {
  return client.messages.send(request);
}

function isDirectRun(metaUrl: string): boolean {
  return process.argv[1] !== undefined && import.meta.url === metaUrl
    && metaUrl === new URL(`file://${process.argv[1]}`).href;
}

if (isDirectRun(import.meta.url)) {
  const { apiKeyAuth, request } = readSendChannelConfig();
  const client = createPumbleClient({ apiKeyAuth });
  const result = await sendChannelMessage(client, request);
  console.log(JSON.stringify(result, null, 2));
}
