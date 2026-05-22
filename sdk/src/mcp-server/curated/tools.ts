import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import { resolveChannel, resolveUser } from "../../extensions/index.js";
import type { CuratedClient } from "./types.js";

export const CURATED_TOOL_NAMES = [
  "get_current_user",
  "resolve_user",
  "resolve_channel",
] as const;

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function jsonTool(
  run: () => Promise<unknown>,
): Promise<CallToolResult> {
  try {
    return jsonResult(await run());
  } catch (error) {
    return errorResult(error);
  }
}

export function registerCuratedTools(
  server: McpServer,
  client: CuratedClient,
): void {
  server.tool(
    "get_current_user",
    "Get the authenticated Pumble user for the configured API key.",
    async (ctx: ToolExtra) =>
      jsonTool(() => client.users.myInfo({ signal: ctx.signal })),
  );

  server.tool(
    "resolve_user",
    "Resolve a user by exact email, exact name, or partial name.",
    {
      query: z.string().min(1).describe("User email, name, or partial name."),
    },
    async ({ query }) => jsonTool(() => resolveUser(client, query)),
  );

  server.tool(
    "resolve_channel",
    "Resolve a channel by exact name or partial name. A leading # is accepted.",
    {
      query: z.string().min(1).describe("Channel name, with or without #."),
    },
    async ({ query }) => jsonTool(() => resolveChannel(client, query)),
  );
}
