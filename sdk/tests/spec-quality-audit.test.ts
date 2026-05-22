import { describe, expect, it } from "vitest";
import { auditOpenApiDocument, formatAuditFindings } from "../scripts/spec-quality-audit.mjs";

function documentWithOperation(path: string, method: string, operation: Record<string, unknown>) {
  return {
    openapi: "3.1.0",
    paths: {
      [path]: {
        [method]: operation,
      },
    },
  };
}

function baseOperation(overrides: Record<string, unknown> = {}) {
  return {
    operationId: "listChannels",
    tags: ["Channels"],
    responses: {
      "200": {
        description: "OK",
      },
    },
    ...overrides,
  };
}

describe("spec quality audit", () => {
  it("reports operations missing SDK-critical metadata", () => {
    const doc = documentWithOperation("/broken", "get", {
      operationId: " ",
      tags: [],
      responses: {},
    });

    expect(auditOpenApiDocument(doc)).toEqual([
      {
        code: "operation-id/missing",
        location: "GET /broken",
        message: "Operation must define a non-empty operationId.",
      },
      {
        code: "tags/missing",
        location: "GET /broken",
        message: "Operation must define at least one tag.",
      },
      {
        code: "responses/missing",
        location: "GET /broken",
        message: "Operation must document at least one response.",
      },
    ]);
  });

  it("flags unsafe example values but allows placeholder examples", () => {
    const doc = documentWithOperation(
      "/createChannel",
      "post",
      baseOperation({
        operationId: "createChannel",
        requestBody: {
          content: {
            "application/json": {
              example: {
                safeEmail: "user-1@example.invalid",
                safeId: "aaaaaaaaaaaaaaaaaaaa0001",
                realEmail: "person@company.com",
                liveId: "65f0123456789abcdef01234",
                name: "sdk-livetest-123",
              },
            },
          },
        },
      }),
    );

    const findings = auditOpenApiDocument(doc);

    expect(findings.map((finding) => finding.code)).toEqual([
      "examples/real-email",
      "examples/live-id",
      "examples/sdk-livetest",
    ]);
  });

  it("requires idempotency documentation for new message-creating operations", () => {
    const doc = documentWithOperation(
      "/createBroadcastMessage",
      "post",
      baseOperation({
        operationId: "createBroadcastMessage",
        tags: ["Messages"],
      }),
    );

    expect(auditOpenApiDocument(doc)).toEqual([
      {
        code: "message-create/idempotency",
        location: "POST /createBroadcastMessage",
        message:
          "Message-creating operation must document Idempotency-Key support or be explicitly allowlisted as retry-unsafe.",
      },
    ]);
  });

  it("accepts documented Idempotency-Key support and the current retry-unsafe allowlist", () => {
    const idempotentDoc = documentWithOperation(
      "/createBroadcastMessage",
      "post",
      baseOperation({
        operationId: "createBroadcastMessage",
        tags: ["Messages"],
        parameters: [{ name: "Idempotency-Key", in: "header", schema: { type: "string" } }],
      }),
    );
    const currentUnsafeDoc = documentWithOperation(
      "/sendMessage",
      "post",
      baseOperation({
        operationId: "sendMessage",
        tags: ["Messages"],
      }),
    );

    expect(auditOpenApiDocument(idempotentDoc)).toEqual([]);
    expect(auditOpenApiDocument(currentUnsafeDoc)).toEqual([]);
  });

  it("formats findings for CLI output", () => {
    expect(
      formatAuditFindings([
        {
          code: "responses/missing",
          location: "GET /broken",
          message: "Operation must document at least one response.",
        },
      ]),
    ).toBe("Spec quality audit failed with 1 finding(s):\n- [responses/missing] GET /broken: Operation must document at least one response.");
  });
});
