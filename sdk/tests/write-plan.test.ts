import { createHash } from "node:crypto";
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
      textSha256: createHash("sha256")
        .update("Ship this message after human approval.", "utf8")
        .digest("hex"),
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

  it("binds the full message text, not only the 160-char excerpt", () => {
    const sharedHead = "x".repeat(200);
    const original = createWritePreview({
      type: "send_message",
      targetKind: "channel",
      targetId: "channel-1",
      text: `${sharedHead} original tail`,
    });
    const tampered = createWritePreview({
      type: "send_message",
      targetKind: "channel",
      targetId: "channel-1",
      text: `${sharedHead} tampered tail`,
    });

    expect(tampered.textExcerpt).toBe(original.textExcerpt);
    expect(tampered.textSha256).not.toBe(original.textSha256);

    const token = createConfirmationToken(original, "agent-local-salt");
    expect(verifyConfirmationToken(tampered, token, "agent-local-salt")).toBe(false);
  });
});
