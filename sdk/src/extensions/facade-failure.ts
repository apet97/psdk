import {
  formatChannelCandidateLabel,
  formatUserCandidateLabel,
  type ResolveChannelCandidate,
  type ResolveUserCandidate,
} from "./resolve.js";

export type FacadeFailureReason =
  | "not_found"
  | "ambiguous"
  | "invalid_request"
  | "api_error"
  | "transport_error";

export interface FacadeFailure<TChoice> {
  ok: false;
  reason: FacadeFailureReason;
  summary: string;
  choices: TChoice[];
  nextActions: string[];
  cause?: unknown;
}

export function isFacadeFailure(value: unknown): value is FacadeFailure<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FacadeFailure<unknown>>;
  return candidate.ok === false
    && (
      candidate.reason === "not_found"
      || candidate.reason === "ambiguous"
      || candidate.reason === "invalid_request"
      || candidate.reason === "api_error"
      || candidate.reason === "transport_error"
    )
    && typeof candidate.summary === "string"
    && Array.isArray(candidate.choices)
    && Array.isArray(candidate.nextActions);
}

export function createFacadeOperationFailure(
  reason: "api_error" | "transport_error",
  summary: string,
  nextAction: string,
  error: unknown,
): FacadeFailure<never> {
  return {
    ok: false,
    reason,
    summary,
    choices: [],
    nextActions: [nextAction],
    cause: error,
  };
}

export function assertFacadeOk<
  T extends { ok: boolean; summary?: string; nextActions?: string[] },
>(value: T): Extract<T, { ok: true }> {
  if (value.ok === true) return value as Extract<T, { ok: true }>;
  const nextActions = Array.isArray(value.nextActions) && value.nextActions.length > 0
    ? ` Next actions: ${value.nextActions.join(" ")}`
    : "";
  throw new Error(`${value.summary ?? "Facade operation failed."}${nextActions}`);
}

export function createFacadeFailure<TChoice>(
  targetKind: "Channel" | "User",
  input: string,
  result: { ok: false; reason: FacadeFailureReason; candidates: TChoice[] },
): FacadeFailure<TChoice> {
  const target = targetKind.toLowerCase();
  return {
    ok: false,
    reason: result.reason,
    summary: `${targetKind} ${JSON.stringify(input)} is ${
      result.reason === "ambiguous" ? "ambiguous" : "not found"
    }.`,
    choices: result.candidates.map((choice) => candidateWithLabel(targetKind, choice)),
    nextActions: result.reason === "ambiguous"
      ? [`Use a more exact ${targetKind} value or pass one returned ${target} id.`]
      : [`Check the ${target} name, email, or id and try again.`],
  };
}

export function createFacadeInvalidRequest(
  summary: string,
  nextAction: string,
): FacadeFailure<never> {
  return {
    ok: false,
    reason: "invalid_request",
    summary,
    choices: [],
    nextActions: [nextAction],
  };
}

function candidateWithLabel<TChoice>(targetKind: "Channel" | "User", choice: TChoice): TChoice {
  if (typeof choice !== "object" || choice === null || "label" in choice) return choice;
  if (targetKind === "Channel" && "id" in choice && "name" in choice && "channelType" in choice) {
    const channel = choice as TChoice & ResolveChannelCandidate;
    return {
      ...choice,
      label: formatChannelCandidateLabel(channel),
    };
  }
  if (targetKind === "User" && "id" in choice && "email" in choice && "name" in choice) {
    const user = choice as TChoice & ResolveUserCandidate;
    return {
      ...choice,
      label: formatUserCandidateLabel(user),
    };
  }
  return choice;
}
