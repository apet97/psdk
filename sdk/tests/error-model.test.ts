import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(resolve(__dirname, "..", "docs", "ERRORS.md"), "utf8");

describe("error model doc", () => {
  it.each(["permission", "not-found", "rate-limit", "validation", "transient", "unknown"])(
    "names error category %s",
    (c) => expect(text).toContain(c),
  );

  it.each(["raw SDK", "facade", "CLI", "MCP"])(
    "covers surface %s",
    (s) => expect(text).toContain(s),
  );

  it("includes assertFacadeOk example", () => {
    expect(text).toContain("assertFacadeOk");
  });
});
