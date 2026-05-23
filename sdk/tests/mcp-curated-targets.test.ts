import { describe, expect, it, vi } from "vitest";
import { resolveCuratedChannelTarget } from "../src/mcp-server/curated/targets.js";

function clientWithChannels(channels: Array<{ id: string; name: string; channelType: "PUBLIC" | "PRIVATE" }>) {
  return {
    channels: {
      listChannels: vi.fn().mockResolvedValue(channels.map((channel) => ({
        channel,
        users: [],
      }))),
    },
  };
}

describe("curated MCP channel targets", () => {
  it("accepts explicit channel ids without listing channels", async () => {
    const client = clientWithChannels([]);

    await expect(resolveCuratedChannelTarget(client as never, "get_channel_context", {
      channelId: "channel-1",
      channel: "ops",
    })).resolves.toEqual({
      ok: true,
      channelId: "channel-1",
      channelName: "ops",
    });
    expect(client.channels.listChannels).not.toHaveBeenCalled();
  });

  it("returns the standard failure envelope for ambiguous channel names", async () => {
    const client = clientWithChannels([
      { id: "c1", name: "general", channelType: "PUBLIC" },
      { id: "c2", name: "general-team", channelType: "PRIVATE" },
    ]);

    await expect(resolveCuratedChannelTarget(client as never, "send_message_preview", {
      channel: "gen",
    })).resolves.toEqual({
      ok: false,
      summary: "Channel \"gen\" is ambiguous.",
      ids: {},
      data: {
        reason: "ambiguous",
        choices: [
          { id: "c1", name: "general", channelType: "PUBLIC", label: "#general | PUBLIC | c1" },
          {
            id: "c2",
            name: "general-team",
            channelType: "PRIVATE",
            label: "#general-team | PRIVATE | c2",
          },
        ],
      },
      nextActions: ["Call find_channel with a more exact value or pass one returned channel id."],
    });
  });

  it("throws the tool-specific missing-target error before SDK calls", async () => {
    const client = clientWithChannels([]);

    await expect(resolveCuratedChannelTarget(client as never, "reply_to_thread_preview", {}))
      .rejects.toThrow("reply_to_thread_preview: channelId or channel is required");
    expect(client.channels.listChannels).not.toHaveBeenCalled();
  });
});
