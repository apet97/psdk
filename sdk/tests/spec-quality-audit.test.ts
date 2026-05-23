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

  it("rejects new message-creating operations when automatic retries apply without idempotency", () => {
    const doc = {
      openapi: "3.1.0",
      "x-speakeasy-retries": {
        strategy: "backoff",
        statusCodes: ["429", "5XX"],
        retryConnectionErrors: true,
      },
      paths: {
        "/createBroadcastMessage": {
          post: baseOperation({
            operationId: "createBroadcastMessage",
            tags: ["Messages"],
          }),
        },
      },
    };

    expect(auditOpenApiDocument(doc)).toEqual([
      {
        code: "message-create/retry-unsafe",
        location: "POST /createBroadcastMessage",
        message:
          "Message-creating operation must document Idempotency-Key support or avoid generated automatic retries.",
      },
    ]);
  });

  it("rejects retry-unsafe message creation without explicit no-retry or idempotency", () => {
    const doc = documentWithOperation(
      "/sendMessage",
      "post",
      baseOperation({
        operationId: "sendMessage",
        tags: ["Messages"],
        "x-speakeasy-retries": {
          strategy: "backoff",
          statusCodes: ["429", "5XX"],
          retryConnectionErrors: true,
        },
      }),
    );

    expect(auditOpenApiDocument(doc)).toEqual([
      expect.objectContaining({
        code: "message-create/retry-unsafe",
        location: "POST /sendMessage",
      }),
    ]);
  });

  it("accepts retry-unsafe message creation when retries are explicitly disabled", () => {
    const doc = documentWithOperation(
      "/sendMessage",
      "post",
      baseOperation({
        operationId: "sendMessage",
        tags: ["Messages"],
        "x-speakeasy-retries": { strategy: "none", statusCodes: ["5XX"] },
      }),
    );

    expect(auditOpenApiDocument(doc)).toEqual([]);
  });

  it("flags x-speakeasy-retries blocks missing statusCodes (matches speakeasy lint)", () => {
    const doc = documentWithOperation(
      "/sendMessage",
      "post",
      baseOperation({
        operationId: "sendMessage",
        tags: ["Messages"],
        "x-speakeasy-retries": { strategy: "none" },
      }),
    );

    expect(auditOpenApiDocument(doc)).toEqual([
      {
        code: "retries/missing-statuscodes",
        location: "POST /sendMessage",
        message:
          "x-speakeasy-retries must declare a non-empty statusCodes array (required by speakeasy lint).",
      },
    ]);
  });

  it("flags document-level x-speakeasy-retries missing statusCodes", () => {
    const doc = {
      openapi: "3.1.0",
      "x-speakeasy-retries": { strategy: "backoff" },
      paths: {
        "/list": {
          get: baseOperation({ operationId: "list", tags: ["Channels"] }),
        },
      },
    };

    expect(auditOpenApiDocument(doc)).toEqual([
      {
        code: "retries/missing-statuscodes",
        location: "<document>",
        message:
          "x-speakeasy-retries must declare a non-empty statusCodes array (required by speakeasy lint).",
      },
    ]);
  });

  it("accepts documented Idempotency-Key support", () => {
    const idempotentDoc = documentWithOperation(
      "/createBroadcastMessage",
      "post",
      baseOperation({
        operationId: "createBroadcastMessage",
        tags: ["Messages"],
        parameters: [{ name: "Idempotency-Key", in: "header", schema: { type: "string" } }],
      }),
    );

    expect(auditOpenApiDocument(idempotentDoc)).toEqual([]);
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

import { resolve } from "node:path";
// eslint-disable-next-line import/no-unresolved
import { runAudit } from "../scripts/spec-quality-audit.mjs";

describe("spec quality audit (extended)", () => {
  const report = runAudit({ specPath: resolve(__dirname, "..", "..", "PumbleOpenApi.yaml") });

  it("every operation has a description or summary", () => {
    expect(report.missingDescription).toEqual([]);
  });

  it("write operations declare x-speakeasy-retries strategy:none", () => {
    expect(report.unsafeWriteRetries).toEqual([]);
  });

  it("paginated operations carry pagination metadata", () => {
    expect(report.missingPaginationMetadata).toEqual([]);
  });

  it("no live emails or 24-char IDs leak into examples", () => {
    expect(report.leakedSecrets).toEqual([]);
  });

  it("every x-speakeasy-retries block declares statusCodes (matches speakeasy lint)", () => {
    const missing = report.findings.filter(
      (finding: { code: string }) => finding.code === "retries/missing-statuscodes",
    );
    expect(missing).toEqual([]);
  });
});
