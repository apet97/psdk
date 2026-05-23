import { describe, expect, it } from "vitest";
import {
  CreateScheduledMessageRequest$outboundSchema,
  DmGroupRequest$outboundSchema,
  DmUserRequest$outboundSchema,
  SendMessageRequest$outboundSchema,
  SendReplyRequest$outboundSchema,
} from "../src/models/operations/index.js";

describe("generated write request validation", () => {
  it("requires send message target and non-empty text", () => {
    expect(() => SendMessageRequest$outboundSchema.parse({ text: "hello" })).toThrow();
    expect(() => SendMessageRequest$outboundSchema.parse({ channelId: "c1", text: "" })).toThrow();
    expect(SendMessageRequest$outboundSchema.parse({ channelId: "c1", text: "hello" }))
      .toMatchObject({ channelId: "c1", text: "hello" });
  });

  it("requires reply target, message id, and non-empty text", () => {
    expect(() => SendReplyRequest$outboundSchema.parse({ messageId: "m1", text: "hello" })).toThrow();
    expect(() => SendReplyRequest$outboundSchema.parse({ channelId: "c1", messageId: "", text: "hello" })).toThrow();
    expect(() => SendReplyRequest$outboundSchema.parse({ channelId: "c1", messageId: "m1", text: "" })).toThrow();
  });

  it("requires non-empty dm inputs and at least one group recipient", () => {
    expect(() => DmUserRequest$outboundSchema.parse({ userId: "", text: "hello" })).toThrow();
    expect(() => DmUserRequest$outboundSchema.parse({ userId: "u1", text: "" })).toThrow();
    expect(() => DmGroupRequest$outboundSchema.parse({ userIds: [], text: "hello" })).toThrow();
  });

  it("requires scheduled messages to target a channel, contain text, and be future-ish", () => {
    expect(() => CreateScheduledMessageRequest$outboundSchema.parse({ channelId: "", text: "hello", sendAt: 1893459600000 })).toThrow();
    expect(() => CreateScheduledMessageRequest$outboundSchema.parse({ channelId: "c1", text: "", sendAt: 1893459600000 })).toThrow();
    expect(() => CreateScheduledMessageRequest$outboundSchema.parse({ channelId: "c1", text: "hello", sendAt: 0 })).toThrow();
  });
});
