import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(resolve(__dirname, "..", "docs", "REALTIME.md"), "utf8");

describe("realtime boundary", () => {
  it("clarifies MCP SSE is transport for MCP clients, not Pumble events", () => {
    expect(text).toMatch(/MCP SSE is transport/i);
  });

  it("marks Socket Mode experimental", () => {
    expect(text).toMatch(/Socket Mode.*experimental/i);
  });

  it("explains the lack of a stable Pumble streaming endpoint", () => {
    expect(text).toMatch(/no stable Pumble streaming endpoint/i);
  });
});
