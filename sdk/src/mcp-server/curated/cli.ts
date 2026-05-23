import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createCuratedMcpServer } from "./server.js";
import type { CuratedStartOptions, CuratedTransport } from "./types.js";

class CuratedUsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "CuratedUsageError";
  }
}

function printHelp() {
  process.stdout.write(`
pumble-mcp-curated — workflow-first Pumble MCP server

Usage:
  pumble-mcp-curated start [options]

Options:
  --transport stdio|sse   Transport to use (default: stdio).
  --port <number>         Port for SSE transport (default: 2718).
  --host <host>           Host for SSE transport (default: 127.0.0.1).
  --auth-token <token>    Bearer token required for SSE requests.
  --api-key-auth <key>    Sets the apiKeyAuth auth field for the API.
  --server-url <url>      Overrides the default server URL used by the SDK.
  --server-index <index>  Selects a predefined server used by the SDK.
  --env KEY=VALUE         Sets an environment variable before startup.
  -h, --help              Show this help.

Curated tools:
  whoami
  find_channel
  find_user
  list_channels
  search_messages
  get_channel_context
  get_thread_context
  send_message_preview
  send_message_confirmed
  reply_to_thread_preview
  reply_to_thread_confirmed
`);
}

function valueFor(
  args: string[],
  index: number,
  flag: string,
): { value: string; nextIndex: number } {
  const arg = args[index];
  const prefix = `${flag}=`;
  if (arg?.startsWith(prefix)) {
    return { value: arg.slice(prefix.length), nextIndex: index };
  }

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CuratedUsageError(`pumble-mcp-curated: ${flag} requires a value.`);
  }
  return { value, nextIndex: index + 1 };
}

function parseTransport(value: string): CuratedTransport {
  if (value === "stdio" || value === "sse") return value;
  throw new CuratedUsageError(
    `pumble-mcp-curated: --transport must be 'stdio' or 'sse', got: ${value}`,
  );
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port >= 65536) {
    throw new CuratedUsageError(
      `pumble-mcp-curated: --port must be an integer from 0 to 65535, got: ${value}`,
    );
  }
  return port;
}

function parseHost(value: string): string {
  if (value.trim().length === 0) {
    throw new CuratedUsageError("pumble-mcp-curated: --host requires a non-empty value.");
  }
  return value;
}

function parseEnv(value: string): [string, string] {
  const sep = value.indexOf("=");
  if (sep <= 0 || sep === value.length - 1) {
    throw new CuratedUsageError(
      "pumble-mcp-curated: --env must use KEY=VALUE with non-empty key and value.",
    );
  }
  return [value.slice(0, sep), value.slice(sep + 1)];
}

export function parseCuratedStartArgs(
  argv: string[],
): CuratedStartOptions | "help" {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return "help";
  }

  const [command, ...args] = argv;
  if (command !== "start") {
    throw new CuratedUsageError(
      `pumble-mcp-curated: expected 'start', got: ${command}`,
    );
  }

  let transport: CuratedTransport = "stdio";
  let port = 2718;
  let host = "127.0.0.1";
  let authToken: string | undefined;
  let apiKeyAuth: string | undefined;
  let serverURL: string | undefined;
  let serverIdx: number | undefined;
  const env: [string, string][] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--transport" || arg?.startsWith("--transport=")) {
      const next = valueFor(args, i, "--transport");
      transport = parseTransport(next.value);
      i = next.nextIndex;
      continue;
    }
    if (arg === "--port" || arg?.startsWith("--port=")) {
      const next = valueFor(args, i, "--port");
      port = parsePort(next.value);
      i = next.nextIndex;
      continue;
    }
    if (arg === "--host" || arg?.startsWith("--host=")) {
      const next = valueFor(args, i, "--host");
      host = parseHost(next.value);
      i = next.nextIndex;
      continue;
    }
    if (arg === "--auth-token" || arg?.startsWith("--auth-token=")) {
      const next = valueFor(args, i, "--auth-token");
      authToken = next.value;
      i = next.nextIndex;
      continue;
    }
    if (arg === "--api-key-auth" || arg?.startsWith("--api-key-auth=")) {
      const next = valueFor(args, i, "--api-key-auth");
      apiKeyAuth = next.value;
      i = next.nextIndex;
      continue;
    }
    if (arg === "--server-url" || arg?.startsWith("--server-url=")) {
      const next = valueFor(args, i, "--server-url");
      serverURL = new URL(next.value).toString();
      i = next.nextIndex;
      continue;
    }
    if (arg === "--server-index" || arg?.startsWith("--server-index=")) {
      const next = valueFor(args, i, "--server-index");
      const parsedIndex = Number(next.value);
      if (!Number.isInteger(parsedIndex)) {
        throw new CuratedUsageError(
          `pumble-mcp-curated: --server-index must be an integer, got: ${next.value}`,
        );
      }
      serverIdx = parsedIndex;
      i = next.nextIndex;
      continue;
    }
    if (arg === "--env" || arg?.startsWith("--env=")) {
      const next = valueFor(args, i, "--env");
      env.push(parseEnv(next.value));
      i = next.nextIndex;
      continue;
    }
    if (arg === "--log-level" || arg?.startsWith("--log-level=")) {
      const next = valueFor(args, i, "--log-level");
      i = next.nextIndex;
      continue;
    }
    if (arg === "--tool" || arg?.startsWith("--tool=")) {
      throw new CuratedUsageError(
        "pumble-mcp-curated: --tool is not supported by the curated profile.",
      );
    }
    throw new CuratedUsageError(`pumble-mcp-curated: unknown option ${arg}`);
  }

  return { transport, port, host, authToken, apiKeyAuth, serverURL, serverIdx, env };
}

export function createMcpSseAuthMiddleware(authToken: string | undefined): express.RequestHandler {
  return (req, res, next) => {
    if (authToken === undefined) {
      next();
      return;
    }
    if (req.header("authorization") !== `Bearer ${authToken}`) {
      res.sendStatus(401);
      return;
    }
    next();
  };
}

async function startStdio(options: CuratedStartOptions) {
  const server = createCuratedMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const abort = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
}

async function startSSE(options: CuratedStartOptions) {
  const app = express();
  const sseAuth = createMcpSseAuthMiddleware(options.authToken);
  const mcpServer = createCuratedMcpServer(options);
  let transport: SSEServerTransport | undefined;
  const controller = new AbortController();

  app.get("/sse", sseAuth, async (_req, res) => {
    transport = new SSEServerTransport("/message", res);
    await mcpServer.connect(transport);
    mcpServer.server.onclose = async () => {
      res.end();
    };
  });

  app.post("/message", sseAuth, async (req, res) => {
    if (!transport) {
      throw new Error("Server transport not initialized");
    }
    await transport.handlePostMessage(req, res);
  });

  if (options.host === "0.0.0.0") {
    console.error("MCP SSE is listening on all interfaces. Use --auth-token outside local development.");
  }

  const httpServer = app.listen(options.port, options.host);

  controller.signal.addEventListener("abort", async () => {
    await mcpServer.close();
    httpServer.close(() => process.exit(0));
  });

  const abort = () => controller.abort();
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
}

async function main() {
  const parsed = parseCuratedStartArgs(process.argv.slice(2));
  if (parsed === "help") {
    printHelp();
    return;
  }

  for (const [key, value] of parsed.env ?? []) {
    process.env[key] = value;
  }

  if (parsed.transport === "stdio") {
    await startStdio(parsed);
  } else {
    await startSSE(parsed);
  }
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined
    && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  main().catch((error) => {
    if (error instanceof CuratedUsageError) {
      console.error(error.message);
      process.exit(error.exitCode);
    }
    console.error(error);
    process.exit(1);
  });
}
