import { describe, expect, it, vi } from "vitest";
import { runSearchSmoke, selectDmRecipient } from "../scripts/live-smoke-utils.mjs";

describe("live smoke helpers", () => {
  it("exercises search.recent with the unique run id without requiring live indexing", async () => {
    const searchRecent = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await expect(runSearchSmoke({
      searchRecent,
      query: "run-1",
    })).resolves.toEqual({ ok: true, data: [] });
    expect(searchRecent).toHaveBeenCalledWith({ query: "run-1", limit: 5 });
  });

  it("fails when search.recent returns a facade failure", async () => {
    const searchRecent = vi.fn().mockResolvedValue({ ok: false, summary: "search failed" });

    await expect(runSearchSmoke({
      searchRecent,
      query: "run-1",
    })).rejects.toThrow("search.recent failed: search failed");
  });

  it("selects the first activated non-bot non-guest user for DM smoke", () => {
    expect(selectDmRecipient([
      { id: "self", email: "self@example.invalid", status: "ACTIVATED", role: "USER" },
      { id: "guest", email: "guest@example.invalid", status: "ACTIVATED", role: "GUEST" },
      { id: "bot", email: "bot@example.invalid", status: "ACTIVATED", role: "USER", isPumbleBot: true },
      { id: "inactive", email: "inactive@example.invalid", status: "DEACTIVATED", role: "USER" },
      { id: "ok", email: "ok@example.invalid", status: "ACTIVATED", role: "USER" },
    ], "self")).toEqual({
      id: "ok",
      email: "ok@example.invalid",
      status: "ACTIVATED",
      role: "USER",
    });
  });
});
