import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import { resolveChannel, resolveUser } from "../../extensions/index.js";
import { jsonTool, okPayload, resolveFailurePayload } from "./payloads.js";
import { registerCuratedReadTools } from "./read-tools.js";
import type { CuratedClient } from "./types.js";
import {
  CURATED_WRITE_TOOL_NAMES,
  registerCuratedWriteTools,
  type CuratedWriteToolOptions,
} from "./write-tools.js";

export const CURATED_TOOL_NAMES = [
  "whoami",
  "find_channel",
  "find_user",
  "list_channels",
  "search_messages",
  "get_channel_context",
  "get_thread_context",
  ...CURATED_WRITE_TOOL_NAMES,
] as const;

const CURATED_READ_TOOL_NAMES = [
  "whoami",
  "find_channel",
  "find_user",
  "list_channels",
  "search_messages",
  "get_channel_context",
  "get_thread_context",
] as const;

export interface CuratedToolInfo {
  readonly name: string;
  readonly kind: "read" | "write";
  readonly requiresConfirmation: boolean;
}

export function listCuratedTools(): CuratedToolInfo[] {
  const reads: CuratedToolInfo[] = CURATED_READ_TOOL_NAMES.map((name) => ({
    name,
    kind: "read",
    requiresConfirmation: false,
  }));
  const writes: CuratedToolInfo[] = CURATED_WRITE_TOOL_NAMES.map((name) => ({
    name,
    kind: "write",
    requiresConfirmation: true,
  }));
  return [...reads, ...writes];
}

export type CuratedToolOptions = CuratedWriteToolOptions;

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

type ResolvePayloadResult =
  | Awaited<ReturnType<typeof resolveChannel>>
  | Awaited<ReturnType<typeof resolveUser>>;

function resolvePayload(kind: "channel" | "user", query: string, result: ResolvePayloadResult) {
  if (result.ok) {
    const value = result.value;
    const label = "email" in value ? value.email : `#${value.name}`;
    return okPayload(`Found ${kind} ${label}.`, value, { [`${kind}Id`]: value.id });
  }
  return resolveFailurePayload(kind === "channel" ? "Channel" : "User", query, result);
}

export function registerCuratedTools(
  server: McpServer,
  client: CuratedClient,
  options: CuratedToolOptions = {},
): void {
  server.tool(
    "whoami",
    "Get the authenticated Pumble user for the configured API key.",
    async (ctx: ToolExtra) =>
      jsonTool(async () => {
        const user = await client.users.myInfo({ signal: ctx.signal });
        return okPayload(`Authenticated as ${user.name} <${user.email}>.`, user, {
          userId: user.id,
        });
      }),
  );

  server.tool(
    "find_channel",
    "Resolve a channel by exact id, exact name, or partial name. A leading # is accepted.",
    {
      query: z.string().min(1).describe("Channel name, with or without #."),
    },
    async ({ query }) => jsonTool(async () =>
      resolvePayload("channel", query, await resolveChannel(client, query))
    ),
  );

  server.tool(
    "find_user",
    "Resolve a user by exact id, email, exact name, or partial name.",
    {
      query: z.string().min(1).describe("User email, name, or partial name."),
    },
    async ({ query }) => jsonTool(async () =>
      resolvePayload("user", query, await resolveUser(client, query))
    ),
  );

  registerCuratedReadTools(server, client);
  registerCuratedWriteTools(server, client, options);
}
