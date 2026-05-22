import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SDK_METADATA } from "../../lib/config.js";
import { PumbleSDK } from "../../sdk/sdk.js";
import { registerCuratedTools } from "./tools.js";
import type { CuratedServerOptions } from "./types.js";

export function createCuratedMcpServer(
  options: CuratedServerOptions = {},
): McpServer {
  const server = new McpServer({
    name: "PumbleSDK Curated",
    version: SDK_METADATA.sdkVersion,
  });

  const client = new PumbleSDK({
    apiKeyAuth: options.apiKeyAuth,
    serverURL: options.serverURL,
    serverIdx: options.serverIdx,
  });

  registerCuratedTools(server, client);

  return server;
}
