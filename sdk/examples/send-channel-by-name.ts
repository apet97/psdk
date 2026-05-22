import "dotenv/config";
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const apiKeyAuth = process.env["PUMBLE_API_KEY"];
const channel = process.env["PUMBLE_CHANNEL"] ?? "#general";
const text = process.env["PUMBLE_MESSAGE_TEXT"] ?? "Hello from pumble-sdk.";

if (!apiKeyAuth) {
  throw new Error("PUMBLE_API_KEY is required");
}

const client = createPumbleClient({ apiKeyAuth });
const result = await client.messages.send({ channel, text });

console.log(JSON.stringify(result, null, 2));
