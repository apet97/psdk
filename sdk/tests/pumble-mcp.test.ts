import { describe, expect, it } from "vitest";
import { buildMcpInvocation } from "../bin/pumble-mcp-args.mjs";

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
});
