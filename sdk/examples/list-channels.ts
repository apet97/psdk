import "dotenv/config";
import { PumbleSDK } from "pumble-keys-sdk";

const apiKeyAuth = process.env["PUMBLE_API_KEY"];
if (!apiKeyAuth) {
  throw new Error("PUMBLE_API_KEY is required");
}

const sdk = new PumbleSDK({ apiKeyAuth });
const channels = await sdk.channels.listChannels();

for (const entry of channels) {
  console.log(`#${entry.channel.name}\t${entry.channel.channelType}\t${entry.channel.id}`);
}
