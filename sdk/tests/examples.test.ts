import { describe, expect, it, vi } from "vitest";
import { runTestingFixturesExample } from "../examples/testing-fixtures.js";

describe("examples", () => {
  it("runs the testing fixtures example without live credentials", async () => {
    const previousApiKey = process.env["PUMBLE_API_KEY"];
    delete process.env["PUMBLE_API_KEY"];
    const liveFetch = vi.fn(() => {
      throw new Error("example attempted to use live fetch");
    });
    vi.stubGlobal("fetch", liveFetch);

    try {
      await expect(runTestingFixturesExample()).resolves.toEqual({
        email: "user-1@example.invalid",
        name: "Fixture User",
        requestCount: 1,
        userId: "000000000000000000000001",
        workspaceId: "000000000000000000000002",
      });
      expect(liveFetch).not.toHaveBeenCalled();
    } finally {
      if (previousApiKey === undefined) {
        delete process.env["PUMBLE_API_KEY"];
      } else {
        process.env["PUMBLE_API_KEY"] = previousApiKey;
      }
      vi.unstubAllGlobals();
    }
  });
});
