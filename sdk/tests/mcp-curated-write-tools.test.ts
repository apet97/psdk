import { describe, expect, it, vi } from "vitest";
import { CURATED_TOOL_NAMES } from "../src/mcp-server/curated/tools.js";
import { registerCuratedHarness } from "./helpers/curated-mcp.js";

function writeClient() {
  return {
    users: { myInfo: vi.fn() },
    channels: {
      listChannels: vi.fn().mockResolvedValue([
        {
          channel: {
            id: "channel-1",
            name: "ops",
            channelType: "PUBLIC",
            workspaceId: "workspace-1",
          },
          pinnedMessages: [],
          users: [],
        },
      ]),
    },
    messages: {
      sendMessage: vi.fn().mockResolvedValue({ id: "sent-1", channelId: "channel-1" }),
      sendReply: vi.fn().mockResolvedValue({ id: "reply-1", channelId: "channel-1" }),
    },
  };
}

describe("curated write workflow tools", () => {
  it("registers only preview/confirmed writes on the curated profile", () => {
    const harness = registerCuratedHarness(writeClient());

    expect(CURATED_TOOL_NAMES).toEqual(expect.arrayContaining([
      "send_message_preview",
      "send_message_confirmed",
      "reply_to_thread_preview",
      "reply_to_thread_confirmed",
    ]));
    expect(harness.toolNames()).toEqual(CURATED_TOOL_NAMES);
    expect(harness.tools.has("send_message")).toBe(false);
    expect(harness.tools.has("reply_to_thread")).toBe(false);
    expect(harness.tools.has("delete_message")).toBe(false);
    expect(harness.tools.has("add_reaction")).toBe(false);
  });

  it("rejects send without the preview payload and confirmation token before SDK calls", () => {
    const client = writeClient();
    const harness = registerCuratedHarness(client);

    expect(harness.tool("send_message_confirmed")).toBeDefined();
    expect(() => harness.parseArgs("send_message_confirmed", {
      request: { channelId: "channel-1", text: "ship it" },
    })).toThrow();
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("requires resolved channel IDs in confirmed write schemas", () => {
    const harness = registerCuratedHarness(writeClient());
    const preview = {
      actionType: "send_message",
      targetKind: "channel",
      targetId: "channel-1",
      textExcerpt: "ship it",
      riskLevel: "medium",
    };

    expect(() => harness.parseArgs("send_message_confirmed", {
      request: { channel: "#ops", text: "ship it" },
      preview,
      confirmationToken: "token",
    })).toThrow();
    expect(() => harness.parseArgs("reply_to_thread_confirmed", {
      request: { channel: "#ops", messageId: "root-1", text: "ship it" },
      preview: {
        ...preview,
        actionType: "reply_to_thread",
        targetKind: "thread",
        targetId: "channel-1/root-1",
      },
      confirmationToken: "token",
    })).toThrow();
  });

  it("previews a send target by resolving channel names without calling the write SDK", async () => {
    const client = writeClient();
    const harness = registerCuratedHarness(client);

    const payload = harness.json(await harness.invoke("send_message_preview", {
      channel: "#ops",
      text: "Ship this after approval.",
    }));

    expect(payload).toMatchObject({
      ok: true,
      summary: "Preview ready to send a message to ops.",
      ids: { channelId: "channel-1" },
      data: {
        request: {
          channelId: "channel-1",
          channel: "ops",
          text: "Ship this after approval.",
        },
        preview: {
          actionType: "send_message",
          targetKind: "channel",
          targetId: "channel-1",
          targetName: "ops",
          textExcerpt: "Ship this after approval.",
          riskLevel: "medium",
        },
        confirmationToken: expect.stringMatching(/^pumble-write-plan-v1\./),
      },
      nextActions: ["Call send_message_confirmed with this request, preview, and confirmationToken."],
    });
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a tampered send preview before SDK calls", async () => {
    const client = writeClient();
    const harness = registerCuratedHarness(client);
    const payload = harness.json(await harness.invoke("send_message_preview", {
      channelId: "channel-1",
      text: "Ship this after approval.",
    }));

    const result = await harness.invoke("send_message_confirmed", {
      ...(payload["data"] as Record<string, unknown>),
      preview: {
        ...((payload["data"] as { preview: Record<string, unknown> }).preview),
        targetId: "channel-2",
      },
    });

    expect(harness.errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a confirmed send whose text differs beyond the preview excerpt", async () => {
    const client = writeClient();
    const harness = registerCuratedHarness(client);
    const sharedHead = "x".repeat(157);
    const payload = harness.json(await harness.invoke("send_message_preview", {
      channelId: "channel-1",
      text: `${sharedHead} original tail`,
    }));

    const data = payload["data"] as { request: Record<string, unknown> } & Record<string, unknown>;
    const result = await harness.invoke("send_message_confirmed", {
      ...data,
      request: { ...data.request, text: `${sharedHead} tampered tail` },
    });

    expect(harness.errorText(result)).toMatch(/confirmation/i);
    expect(client.messages.sendMessage).not.toHaveBeenCalled();
  });

  it("confirmed send calls the generated SDK once with the resolved request", async () => {
    const client = writeClient();
    const harness = registerCuratedHarness(client);
    const payload = harness.json(await harness.invoke("send_message_preview", {
      channel: "#ops",
      text: "Ship this after approval.",
      asBot: true,
    }));

    expect(harness.json(await harness.invoke("send_message_confirmed", payload["data"] as Record<string, unknown>))).toMatchObject({
      ok: true,
      summary: "Sent message sent-1.",
      ids: { channelId: "channel-1", messageId: "sent-1" },
      data: { id: "sent-1", channelId: "channel-1" },
    });
    expect(client.messages.sendMessage).toHaveBeenCalledTimes(1);
    expect(client.messages.sendMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      channel: "ops",
      text: "Ship this after approval.",
      asBot: true,
    }, undefined);
  });

  it("confirmed thread reply verifies the preview before calling the generated SDK", async () => {
    const client = writeClient();
    const harness = registerCuratedHarness(client);
    const payload = harness.json(await harness.invoke("reply_to_thread_preview", {
      channel: "#ops",
      messageId: "root-1",
      text: "Reply after approval.",
      alsoSendToChannel: true,
    }));

    expect(payload).toMatchObject({
      ok: true,
      ids: { channelId: "channel-1", rootMessageId: "root-1" },
      data: {
        request: {
          channelId: "channel-1",
          channel: "ops",
          messageId: "root-1",
          text: "Reply after approval.",
          alsoSendToChannel: true,
        },
        preview: {
          actionType: "reply_to_thread",
          targetKind: "thread",
          targetId: "channel-1/root-1",
          targetName: "ops",
          textExcerpt: "Reply after approval.",
          riskLevel: "medium",
        },
        confirmationToken: expect.stringMatching(/^pumble-write-plan-v1\./),
      },
    });

    expect(harness.json(await harness.invoke("reply_to_thread_confirmed", payload["data"] as Record<string, unknown>))).toMatchObject({
      ok: true,
      summary: "Sent reply reply-1.",
      ids: {
        channelId: "channel-1",
        messageId: "reply-1",
        rootMessageId: "root-1",
      },
      data: { id: "reply-1", channelId: "channel-1" },
    });
    expect(client.messages.sendReply).toHaveBeenCalledTimes(1);
    expect(client.messages.sendReply).toHaveBeenCalledWith({
      channelId: "channel-1",
      channel: "ops",
      messageId: "root-1",
      text: "Reply after approval.",
      alsoSendToChannel: true,
    }, undefined);
  });
});
