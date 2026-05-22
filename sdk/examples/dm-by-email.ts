import "dotenv/config";
import { createPumbleClient } from "pumble-sdk/extensions/index.js";

const apiKeyAuth = process.env["PUMBLE_API_KEY"];
const user = process.env["PUMBLE_USER_EMAIL"];
const text = process.env["PUMBLE_DM_TEXT"] ?? "Hello from pumble-sdk.";

if (!apiKeyAuth) {
  throw new Error("PUMBLE_API_KEY is required");
}
if (!user) {
  throw new Error("PUMBLE_USER_EMAIL is required");
}

const client = createPumbleClient({ apiKeyAuth });
const result = await client.messages.dm({ user, text });

console.log(JSON.stringify(result, null, 2));
