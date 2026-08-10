import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runTestingFixturesExample } from "../examples/testing-fixtures.js";

const examplesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "examples");
const packSmokePath = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "pack-smoke.mjs");

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

  it("import-checks the reply-to-thread recipe without live credentials", async () => {
    const previousApiKey = process.env["PUMBLE_API_KEY"];
    delete process.env["PUMBLE_API_KEY"];
    const liveFetch = vi.fn(() => {
      throw new Error("example attempted to use live fetch");
    });
    vi.stubGlobal("fetch", liveFetch);

    try {
      const recipe = await import("../examples/reply-to-thread.js");
      expect(recipe.replyToThreadRequiredEnv).toEqual([
        "PUMBLE_API_KEY",
        "PUMBLE_CHANNEL_ID",
        "PUMBLE_THREAD_ROOT_ID",
      ]);
      expect(recipe.buildReplyToThreadRequest({
        channelId: " channel-1 ",
        rootMessageId: " root-1 ",
        text: " Reply after review. ",
        alsoSendToChannel: true,
      })).toEqual({
        channelId: "channel-1",
        messageId: "root-1",
        text: "Reply after review.",
        alsoSendToChannel: true,
      });
      expect(recipe.readReplyToThreadConfig({
        PUMBLE_API_KEY: "fixture-api-key",
        PUMBLE_CHANNEL_ID: "channel-1",
        PUMBLE_THREAD_ROOT_ID: "root-1",
      })).toEqual({
        apiKeyAuth: "fixture-api-key",
        request: {
          channelId: "channel-1",
          messageId: "root-1",
          text: "Thanks for the context.",
          alsoSendToChannel: false,
        },
      });
      const replyToThread = vi.fn().mockResolvedValue({ id: "reply-1", channelId: "channel-1" });
      await expect(recipe.sendThreadReply({ threads: { replyToThread } } as never, {
        channelId: "channel-1",
        messageId: "root-1",
        text: "Reply after review.",
      })).resolves.toEqual({ id: "reply-1", channelId: "channel-1" });
      expect(replyToThread).toHaveBeenCalledWith({
        channelId: "channel-1",
        messageId: "root-1",
        text: "Reply after review.",
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

  it("imports facade examples without live credentials and runs helpers with injected clients", async () => {
    const previousApiKey = process.env["PUMBLE_API_KEY"];
    delete process.env["PUMBLE_API_KEY"];
    const liveFetch = vi.fn(() => {
      throw new Error("example attempted to use live fetch");
    });
    vi.stubGlobal("fetch", liveFetch);

    try {
      const sendRecipe = await import("../examples/send-channel-by-name.js");
      const dmRecipe = await import("../examples/dm-by-email.js");
      const searchRecipe = await import("../examples/search-and-reply.js");
      const scheduleRecipe = await import("../examples/schedule-message.js");

      expect(sendRecipe.sendChannelRequiredEnv).toEqual(["PUMBLE_API_KEY"]);
      expect(sendRecipe.buildSendChannelRequest({
        channel: " #general ",
        text: " Hello channel. ",
      })).toEqual({ channel: "#general", text: "Hello channel." });
      expect(sendRecipe.readSendChannelConfig({
        PUMBLE_API_KEY: "fixture-key",
        PUMBLE_CHANNEL: "#ops",
      })).toEqual({
        apiKeyAuth: "fixture-key",
        request: { channel: "#ops", text: "Hello from pumble-keys-sdk." },
      });
      const send = vi.fn().mockResolvedValue({ ok: true, ids: { messageId: "m1" } });
      await expect(sendRecipe.sendChannelMessage({ messages: { send } }, {
        channel: "#general",
        text: "Hello channel.",
      })).resolves.toEqual({ ok: true, ids: { messageId: "m1" } });

      expect(dmRecipe.dmByEmailRequiredEnv).toEqual(["PUMBLE_API_KEY", "PUMBLE_USER_EMAIL"]);
      expect(dmRecipe.buildDmByEmailRequest({
        user: " ada@example.invalid ",
        text: " Hello Ada. ",
      })).toEqual({ user: "ada@example.invalid", text: "Hello Ada." });
      const dm = vi.fn().mockResolvedValue({ ok: true, ids: { messageId: "dm1" } });
      await expect(dmRecipe.sendDmByEmail({ messages: { dm } }, {
        user: "ada@example.invalid",
        text: "Hello Ada.",
      })).resolves.toEqual({ ok: true, ids: { messageId: "dm1" } });

      expect(searchRecipe.searchAndReplyRequiredEnv).toEqual(["PUMBLE_API_KEY"]);
      expect(searchRecipe.readSearchAndReplyConfig({
        PUMBLE_API_KEY: "fixture-key",
        PUMBLE_SEARCH_QUERY: " release ",
        PUMBLE_REPLY_TEXT: " Looks good. ",
      })).toEqual({
        apiKeyAuth: "fixture-key",
        query: "release",
        replyText: "Looks good.",
      });
      const search = vi.fn().mockResolvedValue({
        ok: true,
        data: [{ id: "hit1", channelId: "c1", threadReplyInfo: { rootId: "root1" } }],
      });
      const reply = vi.fn().mockResolvedValue({ ok: true, ids: { messageId: "r1" } });
      await expect(searchRecipe.searchAndReply({ search: { recent: search }, threads: { reply } }, {
        query: "release",
        replyText: "Looks good.",
      })).resolves.toEqual({
        ok: true,
        search: { ok: true, data: [{ id: "hit1", channelId: "c1", threadReplyInfo: { rootId: "root1" } }] },
        reply: { ok: true, ids: { messageId: "r1" } },
      });

      expect(scheduleRecipe.scheduleMessageRequiredEnv).toEqual(["PUMBLE_API_KEY"]);
      expect(scheduleRecipe.buildScheduleMessageRequest({
        channel: " #ops ",
        text: " Deploy reminder. ",
        delayMs: "60000",
      })).toEqual({
        channel: "#ops",
        text: "Deploy reminder.",
        sendAt: expect.any(Number),
      });
      const scheduled = { ok: true, ids: { scheduledMessageId: "s1" } };
      const create = vi.fn().mockResolvedValue(scheduled);
      await expect(scheduleRecipe.scheduleMessage({ scheduled: { create } } as never, {
        channel: "#ops",
        text: "Deploy reminder.",
        sendAt: 1893456000000,
      })).resolves.toBe(scheduled);

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

  it("documents the curated MCP preview recipe without embedding secrets", async () => {
    const recipe = await readFile(join(examplesDir, "mcp-curated-write.md"), "utf8");

    expect(recipe).toContain("send_message_preview");
    expect(recipe).toContain("send_message_confirmed");
    expect(recipe).toContain("reply_to_thread_preview");
    expect(recipe).toContain("reply_to_thread_confirmed");
    expect(recipe).not.toMatch(/PUMBLE_API_KEY=(?!<your-api-key>)[^\s`]+/);
    expect(recipe).not.toMatch(/\bpmb_[A-Za-z0-9_-]+\b/);
  });

  it("documents the curated MCP readonly recipe with task-oriented tools", async () => {
    const recipe = await readFile(join(examplesDir, "mcp-readonly.md"), "utf8");

    expect(recipe).toContain("PUMBLE_API_KEY=<your-api-key>");
    expect(recipe).toContain("whoami");
    expect(recipe).toContain("find_channel");
    expect(recipe).toContain("get_channel_context");
    expect(recipe).not.toMatch(/PUMBLE_API_KEY=(?!<your-api-key>)[^\s`]+/);
    expect(recipe).not.toMatch(/\bpmb_[A-Za-z0-9_-]+\b/);
  });

  it("keeps examples excluded from the npm tarball smoke test", async () => {
    const packSmoke = await readFile(packSmokePath, "utf8");

    expect(packSmoke).toContain("examples directory");
    expect(packSmoke).toContain("^package\\/examples\\/");
  });

  it("import-checks stable workflow examples without adding core dependencies", async () => {
    const addReaction = await import("../examples/add-reaction.js");
    const otel = await import("../examples/opentelemetry.js");

    expect(addReaction.buildAddReactionRequest([
      "bbbbbbbbbbbbbbbbbbbb0001",
      "cccccccccccccccccccc0001",
      ":white_check_mark:",
    ])).toEqual({
      channelId: "bbbbbbbbbbbbbbbbbbbb0001",
      messageId: "cccccccccccccccccccc0001",
      reaction: ":white_check_mark:",
    });
    expect(otel.openTelemetryExampleRequiredEnv).toEqual(["PUMBLE_API_KEY"]);
  });
});

describe("examples catalog", () => {
  const idxPath = join(examplesDir, "INDEX.md");
  const idx = readFileSync(idxPath, "utf8");

  it("lists every example path that resolves on disk", () => {
    const rows = idx.split("\n").filter((line) => line.startsWith("| ") && line.includes(".ts"));
    for (const row of rows) {
      const match = row.match(/`([\w/.-]+)`/);
      if (!match) continue;
      const rel = match[1]!;
      expect(existsSync(join(examplesDir, rel)), rel).toBe(true);
    }
  });

  it("every catalog row carries a safety label", () => {
    const rows = idx.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| Example"));
    for (const row of rows) {
      expect(row).toMatch(/\b(read-only|writes|deletes|experimental)\b/i);
    }
  });
});
