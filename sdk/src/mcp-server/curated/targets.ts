import { resolveChannel } from "../../extensions/index.js";
import {
  resolveFailurePayload,
  type CuratedFailurePayload,
} from "./payloads.js";
import type { CuratedClient } from "./types.js";

export interface CuratedChannelTargetArgs {
  channel?: string | undefined;
  channelId?: string | undefined;
}

export interface CuratedChannelTarget {
  ok: true;
  channelId: string;
  channelName?: string | undefined;
}

export async function resolveCuratedChannelTarget(
  client: CuratedClient,
  toolName: string,
  args: CuratedChannelTargetArgs,
): Promise<CuratedChannelTarget | CuratedFailurePayload> {
  if (args.channelId !== undefined) {
    return { ok: true, channelId: args.channelId, channelName: args.channel };
  }
  if (args.channel === undefined) {
    throw new Error(`${toolName}: channelId or channel is required`);
  }
  const result = await resolveChannel(client, args.channel);
  if (!result.ok) return resolveFailurePayload("Channel", args.channel, result);
  return { ok: true, channelId: result.value.id, channelName: result.value.name };
}
