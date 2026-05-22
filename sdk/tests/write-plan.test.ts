import { describe, expect, it } from "vitest";
import {
  createConfirmationToken,
  createWritePreview,
  verifyConfirmationToken,
} from "../src/extensions/write-plan.js";

describe("write-plan helpers", () => {
  it("creates a stable local confirmation token for an unchanged preview", () => {
    const preview = createWritePreview({
      type: "send_message",
      targetKind: "channel",
      targetId: "channel-1",
      targetName: "#general",
      text: "Ship this message after human approval.",
      riskLevel: "medium",
    });

    expect(preview).toEqual({
      actionType: "send_message",
      targetKind: "channel",
      targetId: "channel-1",
      targetName: "#general",
      textExcerpt: "Ship this message after human approval.",
      riskLevel: "medium",
    });

    const token = createConfirmationToken(preview, "agent-local-salt");

    expect(token).toBe(createConfirmationToken(preview, "agent-local-salt"));
    expect(verifyConfirmationToken(preview, token, "agent-local-salt")).toBe(true);
    expect(verifyConfirmationToken(preview, token, "different-salt")).toBe(false);
  });

  it("rejects tampered previews and malformed tokens", () => {
    const preview = createWritePreview({
      type: "delete_message",
      targetKind: "message",
      targetId: "message-1",
      text: "Delete the duplicate message.",
      riskLevel: "high",
    });
    const token = createConfirmationToken(preview, "agent-local-salt");

    expect(verifyConfirmationToken({
      ...preview,
      textExcerpt: "Delete a different message.",
    }, token, "agent-local-salt")).toBe(false);
    expect(verifyConfirmationToken({
      ...preview,
      riskLevel: "low",
    }, token, "agent-local-salt")).toBe(false);
    expect(verifyConfirmationToken(preview, "not-a-write-plan-token", "agent-local-salt")).toBe(false);
  });

  it("redacts sensitive values and truncates long message text in the preview", () => {
    const preview = createWritePreview({
      type: "send_message",
      targetKind: "channel",
      targetName: "#ops",
      text: `Token pmb_1234567890abcdef and password=hunter2 should not leak. ${"x".repeat(240)}`,
      riskLevel: "medium",
    });

    expect(preview.textExcerpt).toContain("[redacted]");
    expect(preview.textExcerpt).not.toContain("pmb_1234567890abcdef");
    expect(preview.textExcerpt).not.toContain("hunter2");
    expect(preview.textExcerpt.length).toBeLessThanOrEqual(160);
    expect(preview.textExcerpt.endsWith("...")).toBe(true);
  });
});
