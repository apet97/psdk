import { fileURLToPath } from "node:url";
import {
  createPumbleClient,
  type PumbleClient,
  type FacadeScheduleCreateRequest,
} from "pumble-sdk/extensions/index.js";

export const scheduleMessageRequiredEnv = ["PUMBLE_API_KEY"] as const;

export interface ScheduleMessageConfig {
  readonly apiKeyAuth: string;
  readonly request: FacadeScheduleCreateRequest;
}

type Env = Record<string, string | undefined>;

export function buildScheduleMessageRequest(input: {
  channel?: string | undefined;
  text?: string | undefined;
  delayMs?: string | number | undefined;
}): FacadeScheduleCreateRequest {
  const delayMs = Number(input.delayMs ?? 60 * 60 * 1000);
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    throw new Error("delayMs must be a positive number");
  }
  return {
    channel: (input.channel ?? "#general").trim(),
    text: (input.text ?? "Scheduled from pumble-sdk.").trim(),
    sendAt: Date.now() + delayMs,
  };
}

export function readScheduleMessageConfig(env: Env = process.env): ScheduleMessageConfig {
  const apiKeyAuth = env["PUMBLE_API_KEY"]?.trim();
  if (!apiKeyAuth) throw new Error("PUMBLE_API_KEY is required");
  return {
    apiKeyAuth,
    request: buildScheduleMessageRequest({
      channel: env["PUMBLE_CHANNEL"],
      text: env["PUMBLE_MESSAGE_TEXT"],
      delayMs: env["PUMBLE_SCHEDULE_DELAY_MS"],
    }),
  };
}

export function scheduleMessage(
  client: Pick<PumbleClient, "scheduled">,
  request: FacadeScheduleCreateRequest,
) {
  return client.scheduled.create(request);
}

async function main(): Promise<void> {
  const { apiKeyAuth, request } = readScheduleMessageConfig();
  const client = createPumbleClient({ apiKeyAuth });
  const receipt = await scheduleMessage(client, request);
  if (!receipt.ok) {
    console.error(receipt.summary);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(receipt, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
