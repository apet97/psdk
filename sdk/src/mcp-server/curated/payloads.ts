import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { categorizeError } from "../../extensions/categorize-error.js";

export interface CuratedFailurePayload {
  ok: false;
  summary: string;
  ids: Record<string, unknown>;
  data: { reason: "not_found" | "ambiguous"; choices: unknown[] };
  nextActions: string[];
}

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function errorResult(error: unknown): CallToolResult {
  const categorized = categorizeError(error);
  const retry = categorized.retryable ? "retryable" : "not retryable";
  return {
    content: [{ type: "text", text: `[${categorized.category}, ${retry}] ${categorized.message}` }],
    isError: true,
  };
}

export async function jsonTool(run: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonResult(await run());
  } catch (error) {
    return errorResult(error);
  }
}

export function okPayload(
  summary: string,
  data: unknown,
  ids: Record<string, unknown> = {},
  nextActions: string[] = [],
) {
  return { ok: true, summary, ids, data, nextActions };
}

export function resolveFailurePayload(
  kind: "Channel" | "User",
  input: string,
  result: { reason: "not_found" | "ambiguous"; candidates: unknown[] },
): CuratedFailurePayload {
  const target = kind.toLowerCase();
  const findTool = kind === "Channel" ? "find_channel" : "find_user";
  return {
    ok: false,
    summary: `${kind} ${JSON.stringify(input)} is ${
      result.reason === "ambiguous" ? "ambiguous" : "not found"
    }.`,
    ids: {},
    data: { reason: result.reason, choices: result.candidates },
    nextActions: result.reason === "ambiguous"
      ? [`Call ${findTool} with a more exact value or pass one returned ${target} id.`]
      : [`Check the ${target} name, email, or id and try again.`],
  };
}

export function isFailurePayload(value: unknown): value is CuratedFailurePayload {
  return typeof value === "object"
    && value !== null
    && "ok" in value
    && (value as { ok?: unknown }).ok === false;
}
