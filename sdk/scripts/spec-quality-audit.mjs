#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const HTTP_METHODS = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);
const SAFE_EMAIL_DOMAINS = new Set(["example.com", "example.invalid", "example.net", "example.org"]);
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
const HEX_ID_PATTERN = /\b[0-9a-f]{24}\b/gi;
const SDK_LIVETEST_PATTERN = /\bsdk[-_\s]?livetest\b/i;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPEC_PATH = resolve(__dirname, "../../PumbleOpenApi.yaml");

export function auditOpenApiDocument(doc) {
  const findings = [];

  if (isRecord(doc) && isRecord(doc["x-speakeasy-retries"]) && !hasNonEmptyStatusCodes(doc["x-speakeasy-retries"])) {
    findings.push({
      code: "retries/missing-statuscodes",
      location: "<document>",
      message:
        "x-speakeasy-retries must declare a non-empty statusCodes array (required by speakeasy lint).",
    });
  }

  for (const { path, method, operation, pathItem } of listOperations(doc)) {
    const location = `${method.toUpperCase()} ${path}`;
    const operationId = typeof operation.operationId === "string" ? operation.operationId.trim() : "";
    const hasTags =
      Array.isArray(operation.tags) &&
      operation.tags.some((tag) => typeof tag === "string" && tag.trim().length > 0);
    const hasResponses = isRecord(operation.responses) && Object.keys(operation.responses).length > 0;

    if (!operationId) {
      findings.push({
        code: "operation-id/missing",
        location,
        message: "Operation must define a non-empty operationId.",
      });
    }

    if (!hasTags) {
      findings.push({
        code: "tags/missing",
        location,
        message: "Operation must define at least one tag.",
      });
    }

    if (!hasResponses) {
      findings.push({
        code: "responses/missing",
        location,
        message: "Operation must document at least one response.",
      });
    }

    if (
      isRecord(operation["x-speakeasy-retries"]) &&
      !hasNonEmptyStatusCodes(operation["x-speakeasy-retries"])
    ) {
      findings.push({
        code: "retries/missing-statuscodes",
        location,
        message:
          "x-speakeasy-retries must declare a non-empty statusCodes array (required by speakeasy lint).",
      });
    }

    if (
      isMessageCreatingOperation(path, method, operation) &&
      hasRetryConfig(operation, doc) &&
      !hasIdempotencyKeySupport(pathItem.parameters, operation.parameters, operation.requestBody) &&
      !hasRetriesDisabled(operation)
    ) {
      findings.push({
        code: "message-create/retry-unsafe",
        location,
        message:
          "Message-creating operation must document Idempotency-Key support or avoid generated automatic retries.",
      });
    }
  }

  scanExamples(doc, "$", findings, false);
  return findings;
}

function hasNonEmptyStatusCodes(retries) {
  return Array.isArray(retries.statusCodes) && retries.statusCodes.length > 0;
}

export function formatAuditFindings(findings) {
  if (findings.length === 0) return "Spec quality audit passed.";
  const lines = findings.map((finding) => `- [${finding.code}] ${finding.location}: ${finding.message}`);
  return `Spec quality audit failed with ${findings.length} finding(s):\n${lines.join("\n")}`;
}

function listOperations(doc) {
  if (!isRecord(doc) || !isRecord(doc.paths)) return [];

  const operations = [];
  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!isRecord(pathItem)) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      const normalizedMethod = method.toLowerCase();
      if (!HTTP_METHODS.has(normalizedMethod) || !isRecord(operation)) continue;
      operations.push({ path, method: normalizedMethod, operation, pathItem });
    }
  }

  return operations;
}

function scanExamples(value, location, findings, insideExample) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanExamples(item, `${location}[${index}]`, findings, insideExample));
    return;
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      scanExamples(
        child,
        `${location}.${key}`,
        findings,
        insideExample || lowerKey === "example" || lowerKey === "examples",
      );
    }
    return;
  }

  if (!insideExample) return;
  inspectExamplePrimitive(value, location, findings);
}

function inspectExamplePrimitive(value, location, findings) {
  if (value === null || value === undefined) return;
  const text = String(value);

  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const domain = match[1]?.toLowerCase();
    if (domain && !SAFE_EMAIL_DOMAINS.has(domain)) {
      findings.push({
        code: "examples/real-email",
        location,
        message: "Example values must use reserved placeholder email domains.",
      });
      break;
    }
  }

  for (const match of text.matchAll(HEX_ID_PATTERN)) {
    const id = match[0].toLowerCase();
    if (!isPlaceholderHexId(id)) {
      findings.push({
        code: "examples/live-id",
        location,
        message: "Example values must not contain real-looking live IDs.",
      });
      break;
    }
  }

  if (SDK_LIVETEST_PATTERN.test(text)) {
    findings.push({
      code: "examples/sdk-livetest",
      location,
      message: "Example values must not contain sdk-livetest text.",
    });
  }
}

function isPlaceholderHexId(id) {
  return /^([0-9a-f])\1{23}$/.test(id) || /^([0-9a-f])\1{19}\d{4}$/.test(id);
}

function isMessageCreatingOperation(path, method, operation) {
  if (method !== "post") return false;

  const tags = Array.isArray(operation.tags)
    ? operation.tags.map((tag) => String(tag).toLowerCase())
    : [];
  if (!tags.some((tag) => tag === "messages" || tag === "scheduled messages")) return false;

  const operationId = typeof operation.operationId === "string" ? operation.operationId.trim().toLowerCase() : "";
  const pathName = path.toLowerCase();
  return (
    operationId.startsWith("send") ||
    operationId.startsWith("dm") ||
    /^create.*message/.test(operationId) ||
    pathName.includes("sendmessage") ||
    pathName.includes("sendreply") ||
    pathName.includes("dmuser") ||
    pathName.includes("dmgroup") ||
    pathName.includes("createscheduledmessage")
  );
}

function hasIdempotencyKeySupport(...values) {
  return values.some((value) => containsIdempotencyKeyName(value));
}

function hasRetriesDisabled(operation) {
  return operation?.["x-sdk-no-write-retries"] === true;
}

function hasRetryConfig(operation, doc) {
  return Boolean(operation?.["x-speakeasy-retries"] ?? doc?.["x-speakeasy-retries"]);
}

function containsIdempotencyKeyName(value) {
  if (Array.isArray(value)) return value.some((item) => containsIdempotencyKeyName(item));

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (isIdempotencyKeyName(key)) return true;
      if (key === "name" && typeof child === "string" && isIdempotencyKeyName(child)) return true;
      if (containsIdempotencyKeyName(child)) return true;
    }
  }

  return false;
}

function isIdempotencyKeyName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "") === "idempotencykey";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runCli() {
  const result = auditSpec(DEFAULT_SPEC_PATH);
  if (!result.ok) {
    console.error(result.message);
    process.exitCode = 1;
    return;
  }
  console.log(result.message);
}

export function auditSpec(specPath) {
  const report = runAudit({ specPath });
  const sections = [];

  if (report.findings.length > 0) {
    sections.push(formatAuditFindings(report.findings));
  }
  if (report.missingDescription.length > 0) {
    sections.push(formatBucket("Operations missing description/summary", report.missingDescription));
  }
  if (report.unsafeWriteRetries.length > 0) {
    sections.push(
      formatBucket(
        "Write operations missing a retry-posture declaration",
        report.unsafeWriteRetries,
      ),
    );
  }
  if (report.missingPaginationMetadata.length > 0) {
    sections.push(
      formatBucket("Paginated operations missing 200 response metadata", report.missingPaginationMetadata),
    );
  }
  if (report.leakedSecrets.length > 0) {
    sections.push(formatBucket("Example values leaking real IDs or emails", report.leakedSecrets));
  }

  if (sections.length === 0) {
    return { ok: true, message: "Spec quality audit passed." };
  }
  return { ok: false, message: sections.join("\n\n") };
}

function formatBucket(title, items) {
  return [`${title} (${items.length}):`, ...items.map((entry) => `  - ${entry}`)].join("\n");
}

export function runAudit({ specPath = DEFAULT_SPEC_PATH } = {}) {
  const doc = parse(readFileSync(specPath, "utf8"));
  const report = {
    findings: auditOpenApiDocument(doc),
    missingDescription: [],
    unsafeWriteRetries: [],
    missingPaginationMetadata: [],
    leakedSecrets: [],
  };

  for (const { path, method, operation } of listOperations(doc)) {
    const where = `${method.toUpperCase()} ${path}`;
    const description =
      typeof operation.description === "string" ? operation.description.trim() : "";
    const summary =
      typeof operation.summary === "string" ? operation.summary.trim() : "";
    if (!description && !summary) {
      report.missingDescription.push(where);
    }

    const isWrite = ["post", "put", "delete", "patch"].includes(method);
    if (isWrite) {
      const retries = operation["x-speakeasy-retries"];
      // A write op must declare its retry posture: either
      // `x-sdk-no-write-retries: true` (non-idempotent — the generated
      // runtime patch clears retry codes; see ADR-0006) or an explicit
      // safe-read backoff (idempotent read-shaped POST like searchMessages).
      if (!isRecord(retries) && operation["x-sdk-no-write-retries"] !== true) {
        report.unsafeWriteRetries.push(where);
      }
    }

    const pagination = operation["x-speakeasy-pagination"];
    if (pagination) {
      const okResponse = isRecord(operation.responses?.["200"]) ? operation.responses["200"] : null;
      if (!okResponse || !isRecord(okResponse.content)) {
        report.missingPaginationMetadata.push(where);
      }
    }
  }

  for (const finding of report.findings) {
    if (finding.code === "examples/real-email" || finding.code === "examples/live-id") {
      report.leakedSecrets.push(`${finding.location}: ${finding.code}`);
    }
  }

  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
