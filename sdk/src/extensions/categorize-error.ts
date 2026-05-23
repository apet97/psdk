import { LegacyError } from "../models/errors/legacy-error.js";
import { PumbleSDKError } from "../models/errors/pumble-sdk-error.js";
import { StructuredError } from "../models/errors/structured-error.js";

export type ErrorCategory =
  | "permission"
  | "not-found"
  | "rate-limit"
  | "validation"
  | "transient"
  | "unknown";

export interface CategorizedError {
  category: ErrorCategory;
  retryable: boolean;
  statusCode: number | null;
  message: string;
  localizedMessage?: string;
  code?: number;
  raw: unknown;
}

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
]);

export function categorizeError(e: unknown): CategorizedError {
  const statusCode = statusCodeOf(e);
  const details = detailsOf(e);
  const networkCode = networkCodeOf(e);

  if (statusCode === 403 && isStructuredLike(e, details)) {
    return categorized(e, "validation", false, statusCode, details);
  }
  if (statusCode === 401 || statusCode === 403) {
    return categorized(e, "permission", false, statusCode, details);
  }
  if (statusCode === 404) {
    return categorized(e, "not-found", false, statusCode, details);
  }
  if (statusCode === 429) {
    return categorized(e, "rate-limit", true, statusCode, details);
  }
  if (statusCode === 408 || statusCode === 425 || (statusCode !== null && statusCode >= 500)) {
    return categorized(e, "transient", true, statusCode, details);
  }
  if ((statusCode === 400 || statusCode === 422) && isStructuredLike(e, details)) {
    return categorized(e, "validation", false, statusCode, details);
  }
  if (networkCode !== null && TRANSIENT_NETWORK_CODES.has(networkCode)) {
    return categorized(e, "transient", true, null, details);
  }

  return categorized(e, "unknown", false, statusCode, details);
}

function categorized(
  raw: unknown,
  category: ErrorCategory,
  retryable: boolean,
  statusCode: number | null,
  details: ErrorDetails,
): CategorizedError {
  return {
    category,
    retryable,
    statusCode,
    message: details.message,
    ...(details.localizedMessage !== undefined ? { localizedMessage: details.localizedMessage } : {}),
    ...(details.code !== undefined ? { code: details.code } : {}),
    raw,
  };
}

function statusCodeOf(e: unknown): number | null {
  if (e instanceof PumbleSDKError) return e.statusCode;
  const statusCode = (e as { statusCode?: unknown } | null)?.statusCode;
  return typeof statusCode === "number" && Number.isInteger(statusCode) ? statusCode : null;
}

interface ErrorDetails {
  message: string;
  localizedMessage?: string;
  code?: number;
  hasValidationField?: boolean;
}

function detailsOf(e: unknown): ErrorDetails {
  if (e instanceof StructuredError) {
    return {
      message: e.message,
      localizedMessage: e.localizedMessage,
      code: e.code,
    };
  }
  if (e instanceof LegacyError) {
    return { message: e.error || e.message };
  }

  const parsed = parsePumbleBody(e);
  if (parsed !== null) {
    const localizedMessage = stringField(parsed, "localizedMessage");
    const code = numberField(parsed, "code");
    const message = stringField(parsed, "message")
      ?? stringField(parsed, "error")
      ?? (e instanceof Error ? e.message : "Unknown error");
    return {
      message,
      ...(localizedMessage !== undefined ? { localizedMessage } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(hasValidationStyleField(parsed) ? { hasValidationField: true } : {}),
    };
  }

  if (e instanceof Error) return { message: e.message };
  return { message: "Unknown error" };
}

function isStructuredLike(e: unknown, details: ErrorDetails): boolean {
  return e instanceof StructuredError
    || details.localizedMessage !== undefined
    || details.code !== undefined
    || details.hasValidationField === true;
}

function parsePumbleBody(e: unknown): Record<string, unknown> | null {
  if (!(e instanceof PumbleSDKError)) return null;
  if (e.body.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(e.body) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hasValidationStyleField(record: Record<string, unknown>): boolean {
  if (typeof record.message !== "string") return false;
  return typeof record.field === "string"
    || Array.isArray(record.fields)
    || Array.isArray(record.errors)
    || Array.isArray(record.violations);
}

function networkCodeOf(e: unknown): string | null {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
}
