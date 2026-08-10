import { fileURLToPath } from "node:url";
import { PumbleSDK } from "pumble-keys-sdk";

export interface AddReactionRequest {
  channelId: string;
  messageId: string;
  reaction: string;
}

export function buildAddReactionRequest(args: string[]): AddReactionRequest {
  const [channelId, messageId, reaction = ":thumbsup:"] = args;
  if (!channelId || !messageId) {
    throw new Error("usage: add-reaction <channel-id> <message-id> [emoji-code]");
  }
  return { channelId, messageId, reaction };
}

export async function addReaction(
  sdk: Pick<PumbleSDK, "messages">,
  request: AddReactionRequest,
) {
  await sdk.messages.addReaction(request);
  return "Reaction added.";
}

async function main(): Promise<void> {
  const apiKeyAuth = process.env["PUMBLE_API_KEY"];
  if (!apiKeyAuth) throw new Error("Set PUMBLE_API_KEY");
  const sdk = new PumbleSDK({ apiKeyAuth });
  console.log(await addReaction(sdk, buildAddReactionRequest(process.argv.slice(2))));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
