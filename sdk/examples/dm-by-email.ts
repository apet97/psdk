import { createPumbleClient } from "pumble-sdk/extensions/index.js";

export const dmByEmailRequiredEnv = ["PUMBLE_API_KEY", "PUMBLE_USER_EMAIL"];

export interface DmByEmailConfig {
  apiKeyAuth: string;
  request: DmByEmailRequest;
}

export interface DmByEmailRequest {
  user: string;
  text: string;
}

export interface DmByEmailClient {
  messages: {
    dm(request: DmByEmailRequest): Promise<unknown>;
  };
}

export function buildDmByEmailRequest(input: {
  user?: string | undefined;
  text?: string | undefined;
}): DmByEmailRequest {
  const user = input.user?.trim();
  if (!user) throw new Error("PUMBLE_USER_EMAIL is required");
  return {
    user,
    text: (input.text ?? "Hello from pumble-sdk.").trim(),
  };
}

export function readDmByEmailConfig(env: NodeJS.ProcessEnv = process.env): DmByEmailConfig {
  const apiKeyAuth = env["PUMBLE_API_KEY"];
  if (!apiKeyAuth) throw new Error("PUMBLE_API_KEY is required");
  return {
    apiKeyAuth,
    request: buildDmByEmailRequest({
      user: env["PUMBLE_USER_EMAIL"],
      text: env["PUMBLE_DM_TEXT"],
    }),
  };
}

export function sendDmByEmail(client: DmByEmailClient, request: DmByEmailRequest) {
  return client.messages.dm(request);
}

function isDirectRun(metaUrl: string): boolean {
  return process.argv[1] !== undefined && import.meta.url === metaUrl
    && metaUrl === new URL(`file://${process.argv[1]}`).href;
}

if (isDirectRun(import.meta.url)) {
  const { apiKeyAuth, request } = readDmByEmailConfig();
  const client = createPumbleClient({ apiKeyAuth });
  const result = await sendDmByEmail(client, request);
  console.log(JSON.stringify(result, null, 2));
}
