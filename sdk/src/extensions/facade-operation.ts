import { PumbleSDKError } from "../models/errors/pumble-sdk-error.js";
import type { FacadeFailure } from "./client.js";

// Shared classification helpers for facade write/scheduled operations.
// Extracted from facade-writes.ts and scheduled.ts, which both turn a
// thrown error into an `api_error`/`transport_error` failure value and
// guard against an already-failed resolver result.

export const operationFailureNextAction =
  "Inspect the raw error or retry after correcting the request.";

export function operationFailureReason(
  error: unknown,
): "api_error" | "transport_error" {
  if (error instanceof PumbleSDKError) return "api_error";
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof statusCode === "number" ? "api_error" : "transport_error";
}

export function isFacadeOperationFailure<T>(
  value: T | FacadeFailure<never>,
): value is FacadeFailure<never> {
  return typeof value === "object"
    && value !== null
    && "ok" in value
    && value.ok === false;
}
