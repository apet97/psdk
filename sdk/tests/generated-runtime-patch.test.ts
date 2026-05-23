import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

const unsafeWriteFunctions = [
  "messages-send-message.ts",
  "messages-send-reply.ts",
  "messages-dm-user.ts",
  "messages-dm-group.ts",
  "scheduled-messages-create-scheduled-message.ts",
];

describe("generated runtime patch", () => {
  it("keeps message-creating writes without default retry codes", () => {
    for (const fileName of unsafeWriteFunctions) {
      const source = readFileSync(join(__dirname, "../src/funcs", fileName), "utf8");

      expect(source).toContain('|| { strategy: "none" }');
      expect(source).toContain("retryCodes: options?.retryCodes || []");
    }
  });

  it("routes generated debug logging through redaction helpers", () => {
    const source = readFileSync(join(__dirname, "../src/lib/sdks.ts"), "utf8");

    expect(source).toContain('from "../extensions/debug-redaction.js"');
    expect(source).toContain("redactDebugHeaders(req.headers)");
    expect(source).toContain("redactDebugHeaders(res.headers)");
    expect(source).toContain("redactDebugValue(await req.clone().json())");
    expect(source).toContain("redactDebugValue(await res.clone().json())");
  });

  it("wraps generated JSON parse failures as response validation errors", () => {
    const source = readFileSync(join(__dirname, "../src/lib/matchers.ts"), "utf8");

    expect(source).toContain('rawMessage: "Response JSON parse failed"');
    expect(source).toContain("new ResponseValidationError(\"Response validation failed\"");
  });

  it("keeps generated write schemas semantically constrained", () => {
    for (const fileName of [
      "send-message.ts",
      "send-reply.ts",
      "dm-user.ts",
      "dm-group.ts",
      "create-scheduled-message.ts",
    ]) {
      const source = readFileSync(join(__dirname, "../src/models/operations", fileName), "utf8");

      expect(source).toContain(".min(1)");
    }
  });
});
