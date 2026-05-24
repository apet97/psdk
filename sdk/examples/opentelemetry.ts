import { fileURLToPath } from "node:url";
import {
  createPumbleClient,
  type PumbleClient,
} from "pumble-keys-sdk/extensions/index.js";

export const openTelemetryExampleRequiredEnv = ["PUMBLE_API_KEY"] as const;

export async function traceWhoami(client: Pick<PumbleClient, "identity">) {
  const { trace } = await import("@opentelemetry/api");
  const tracer = trace.getTracer("pumble-keys-sdk-example");
  return tracer.startActiveSpan("pumble.whoami", async (span) => {
    try {
      const me = await client.identity.me();
      span.setAttribute("pumble.user.id", me.id);
      return me;
    } finally {
      span.end();
    }
  });
}

async function main(): Promise<void> {
  const apiKeyAuth = process.env["PUMBLE_API_KEY"]?.trim();
  if (!apiKeyAuth) throw new Error("PUMBLE_API_KEY is required");
  const client = createPumbleClient({ apiKeyAuth });
  const me = await traceWhoami(client);
  console.log(JSON.stringify({ id: me.id, email: me.email }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
