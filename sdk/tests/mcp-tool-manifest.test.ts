import { describe, expect, it } from "vitest";
import { listCuratedTools } from "../src/mcp-server/curated/tools.js";

const DESTRUCTIVE = ["deleteMessage", "deleteScheduledMessage", "archiveChannel"];

describe("curated MCP tool manifest", () => {
  const tools = listCuratedTools();
  const names = tools.map((t) => t.name);

  it("excludes destructive tools", () => {
    for (const banned of DESTRUCTIVE) {
      expect(names).not.toContain(banned);
    }
  });

  it("every write tool requires confirmation", () => {
    for (const tool of tools.filter((t) => t.kind === "write")) {
      expect(tool.requiresConfirmation).toBe(true);
    }
  });

  it("manifest is stable (snapshot)", () => {
    expect(names.slice().sort()).toMatchSnapshot();
  });
});
