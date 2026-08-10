import { describe, expect, it } from "vitest";
import { CURATED_TOOLS } from "../bin/pumble-mcp-args.mjs";
import { CURATED_TOOL_NAMES } from "../src/mcp-server/curated/tools.js";

// CURATED_TOOL_NAMES (src/mcp-server/curated/tools.ts) is the source of truth
// for the curated tool surface; CURATED_TOOLS (bin/pumble-mcp-args.mjs) is the
// arg parser's independent copy. They are maintained by hand in two files, so
// pin them set-equal: a tool added to one but not the other would silently
// desync CLI arg validation from the served tool set.
describe("curated tool list parity", () => {
  it("bin CURATED_TOOLS matches src CURATED_TOOL_NAMES as a set", () => {
    expect([...CURATED_TOOLS].sort()).toEqual([...CURATED_TOOL_NAMES].sort());
  });

  it("neither source contains duplicate tool names", () => {
    expect(new Set(CURATED_TOOLS).size).toBe(CURATED_TOOLS.length);
    expect(new Set(CURATED_TOOL_NAMES).size).toBe(CURATED_TOOL_NAMES.length);
  });
});
