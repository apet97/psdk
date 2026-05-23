import { describe, expect, it, vi } from "vitest";
import { buildMcpInvocation } from "../bin/pumble-mcp-args.mjs";
import {
  createMcpSseAuthMiddleware,
  parseCuratedStartArgs,
} from "../src/mcp-server/curated/cli.js";

function parsedCuratedStart(argv: string[]) {
  const parsed = parseCuratedStartArgs(argv);
  if (parsed === "help") throw new Error("expected parsed start options");
  return parsed;
}

function runAuthMiddleware(authToken: string | undefined, authorization: string | undefined) {
  const sendStatus = vi.fn();
  const next = vi.fn();
  const middleware = createMcpSseAuthMiddleware(authToken);
  middleware({
    header: vi.fn((name: string) => name.toLowerCase() === "authorization" ? authorization : undefined),
  } as never, {
    sendStatus,
  } as never, next);
  return { sendStatus, next };
}

describe("pumble-mcp wrapper args", () => {
  it("lets --tool=... caller whitelists override profile defaults", () => {
    const invocation = buildMcpInvocation({
      argv: ["start", "--transport", "stdio", "--tool=messages-send-message"],
      env: {},
    });

    expect(invocation.args).toEqual(["start", "--transport", "stdio", "--tool=messages-send-message"]);
  });

  it("adds readonly profile tools when the caller did not provide a whitelist", () => {
    const invocation = buildMcpInvocation({
      argv: ["start", "--transport", "stdio", "--profile", "readonly"],
      env: {},
    });

    expect(invocation.args).toContain("--tool");
    expect(invocation.args).toContain("users-my-info");
    expect(invocation.args).not.toContain("messages-send-message");
  });

  it("injects api-key auth from env when the caller omits the flag", () => {
    const invocation = buildMcpInvocation({
      argv: ["start", "--transport", "stdio"],
      env: { PUMBLE_API_KEY: "env-api-key" },
    });

    expect(invocation.args).toContain("--api-key-auth");
    expect(invocation.args).toContain("env-api-key");
  });

  it("does not override an explicit api-key auth flag", () => {
    const invocation = buildMcpInvocation({
      argv: ["start", "--transport", "stdio", "--api-key-auth", "explicit-key"],
      env: { PUMBLE_API_KEY: "env-api-key" },
    });

    const apiKeyArgIndex = invocation.args.indexOf("--api-key-auth");
    expect(invocation.args[apiKeyArgIndex + 1]).toBe("explicit-key");
    expect(invocation.args.filter((arg) => arg === "--api-key-auth")).toHaveLength(1);
  });

  it("preserves SSE host and auth-token flags for the selected server", () => {
    const invocation = buildMcpInvocation({
      argv: [
        "start",
        "--transport",
        "sse",
        "--host",
        "0.0.0.0",
        "--auth-token",
        "secret-token",
      ],
      env: {},
      generatedMcp: "/tmp/raw-mcp-server.js",
      curatedMcp: "/tmp/pumble-mcp-curated.js",
    });

    expect(invocation.nodeArgs).toEqual([
      "/tmp/pumble-mcp-curated.js",
      "start",
      "--transport",
      "sse",
      "--host",
      "0.0.0.0",
      "--auth-token",
      "secret-token",
    ]);
  });

  it("defaults curated SSE to localhost and accepts explicit all-interface host", () => {
    expect(parsedCuratedStart(["start", "--transport", "sse"])).toMatchObject({
      transport: "sse",
      host: "127.0.0.1",
    });
    expect(parsedCuratedStart([
      "start",
      "--transport",
      "sse",
      "--host",
      "0.0.0.0",
    ])).toMatchObject({
      transport: "sse",
      host: "0.0.0.0",
    });
  });

  it("requires bearer auth for SSE when an auth token is configured", () => {
    expect(runAuthMiddleware(undefined, undefined).next).toHaveBeenCalledOnce();

    const missing = runAuthMiddleware("secret-token", undefined);
    expect(missing.sendStatus).toHaveBeenCalledWith(401);
    expect(missing.next).not.toHaveBeenCalled();

    const wrong = runAuthMiddleware("secret-token", "Bearer wrong-token");
    expect(wrong.sendStatus).toHaveBeenCalledWith(401);
    expect(wrong.next).not.toHaveBeenCalled();

    const correct = runAuthMiddleware("secret-token", "Bearer secret-token");
    expect(correct.sendStatus).not.toHaveBeenCalled();
    expect(correct.next).toHaveBeenCalledOnce();
  });
});
