import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const expectedPatchIds = [
  "non-idempotent-write-retries",
  "debug-redaction",
  "malformed-json-response",
  "outbound-write-validation",
  "retry-backoff-first-delay",
];

describe("generated runtime patch", () => {
  it("keeps a compact patch registry in the patch script", () => {
    const source = readFileSync(join(__dirname, "../scripts/patch-generated-runtime.mjs"), "utf8");

    expect(source).toContain("const PATCH_REGISTRY =");
    expect(source).toContain("owner:");
    expect(source).toContain("removalCondition:");
    for (const id of expectedPatchIds) {
      expect(source).toContain(id);
    }
  });

  it("documents accepted generated runtime patches in ADR 0008", () => {
    const adrPath = join(__dirname, "../docs/adr/0008-generated-runtime-patches.md");
    expect(existsSync(adrPath)).toBe(true);

    const markdown = readFileSync(adrPath, "utf8");
    for (const phrase of [
      "Status: Accepted",
      "## Context",
      "## Accepted Patches",
      "## Test Requirement",
      "## Exit Condition",
      ...expectedPatchIds,
    ]) {
      expect(markdown).toContain(phrase);
    }
    expect(markdown).toContain("| Patch | Owner | Why it remains | Removal condition |");
  });

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

  it("keeps generated backoff from starting at zero for ordinary retries", () => {
    const source = readFileSync(join(__dirname, "../src/lib/retries.ts"), "utf8");

    expect(source).toContain("const attempt = Math.max(1, x)");
    expect(source).toContain("initialInterval * Math.pow(attempt, exponent)");
    expect(source).toContain("function retryIntervalFromResponse(res: Response): number | undefined");
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

  it("clears default retry codes on every duplicate-creating write", () => {
    const duplicateCreatingWrites = [
      "sendMessage",
      "sendReply",
      "dmUser",
      "dmGroup",
      "createScheduledMessage",
      "createChannel",
    ];
    const spec = readFileSync(
      join(__dirname, "../../PumbleOpenApi.yaml"),
      "utf8",
    ).split("\n");
    const funcsDir = join(__dirname, "../src/funcs");
    const funcFiles = readdirSync(funcsDir).filter((f) => f.endsWith(".ts"));

    for (const opId of duplicateCreatingWrites) {
      const specLine = spec.findIndex((l) =>
        l.trim().startsWith(`operationId: ${opId}`),
      );
      expect(specLine, `${opId} must exist in the spec`).toBeGreaterThan(-1);
      const tagged = spec
        .slice(specLine, specLine + 6)
        .some((l) => l.trim() === "x-sdk-no-write-retries: true");
      expect(tagged, `${opId} must carry x-sdk-no-write-retries`).toBe(true);

      const funcFile = funcFiles.find((f) =>
        readFileSync(join(funcsDir, f), "utf8").includes(
          `operationID: "${opId}"`,
        ),
      );
      expect(funcFile, `${opId} must have a generated func`).toBeDefined();
      const source = readFileSync(join(funcsDir, funcFile!), "utf8");
      expect(
        source.includes("retryCodes: options?.retryCodes || []"),
        `${funcFile} must clear default retry codes`,
      ).toBe(true);
    }

    const cleared = funcFiles.filter((f) =>
      readFileSync(join(funcsDir, f), "utf8").includes(
        "retryCodes: options?.retryCodes || []",
      ),
    );
    expect(cleared.length).toBe(duplicateCreatingWrites.length);
  });
});
