import { createHash } from "node:crypto";

type SanitizerState = {
  readonly idMap: Map<string, string>;
  readonly emailMap: Map<string, string>;
  readonly userNameMap: Map<string, string>;
  readonly nameMap: Map<string, string>;
};

const realIdPattern =
  /\b(?!0{20}\d{4}\b)(?!a{20}\d{4}\b)(?!b{20}\d{4}\b)(?!c{20}\d{4}\b)(?!d{20}\d{4}\b)[0-9a-f]{24}\b/gi;
const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const textFields = new Set(["text", "tx", "description", "title", "phone", "code"]);

function createSanitizerState(): SanitizerState {
  return {
    idMap: new Map(),
    emailMap: new Map(),
    userNameMap: new Map(),
    nameMap: new Map(),
  };
}

function nextPlaceholder(
  map: Map<string, string>,
  value: string,
  prefix: string,
  suffix = "",
): string {
  if (!map.has(value)) map.set(value, `${prefix}${map.size + 1}${suffix}`);
  return map.get(value) ?? value;
}

function sanitizeId(value: string, state: SanitizerState): string {
  const existing = value.match(/^(?:0{20}|a{20}|b{20}|c{20}|d{20})\d{4}$/);
  if (existing) return value;
  if (!state.idMap.has(value)) {
    state.idMap.set(value, String(state.idMap.size + 1).padStart(24, "0"));
  }
  return state.idMap.get(value) ?? value;
}

function sanitizeEmail(value: string, state: SanitizerState): string {
  if (value.endsWith("@example.invalid")) return value;
  return nextPlaceholder(state.emailMap, value, "user-", "@example.invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeName(value: string, parent: unknown, state: SanitizerState): string {
  if (/^example-name-[0-9a-f]{8}$/i.test(value)) return value;

  const parentRecord = isRecord(parent) ? parent : undefined;
  const userKey = typeof parentRecord?.["email"] === "string"
    ? sanitizeEmail(parentRecord["email"], state)
    : parentRecord?.["id"] ?? value;
  if (
    parentRecord
    && ("email" in parentRecord || "role" in parentRecord || "timeZoneId" in parentRecord)
  ) {
    return nextPlaceholder(state.userNameMap, String(userKey), "User ");
  }
  if (value.startsWith("sdk-livetest")) return "sdk-livetest-redacted";
  if (!state.nameMap.has(value)) {
    const digest = createHash("sha256").update(value).digest("hex").slice(0, 8);
    state.nameMap.set(value, `example-name-${digest}`);
  }
  return state.nameMap.get(value) ?? value;
}

function sanitizeString(
  value: string,
  key: string | undefined,
  parent: unknown,
  state: SanitizerState,
): string {
  if (key === "email") return sanitizeEmail(value, state);
  if (key === "fullPath" || key === "scaledPath") {
    return "https://example.invalid/redacted-avatar.png";
  }
  if (key === "name") return sanitizeName(value, parent, state);
  if (key && textFields.has(key)) return value.length === 0 ? "" : "[redacted]";
  return value
    .replace(emailPattern, (match) => sanitizeEmail(match, state))
    .replace(realIdPattern, (match) => sanitizeId(match, state));
}

function sanitizeBodyText(text: string, state: SanitizerState): string {
  if (text === "") return text;
  try {
    return JSON.stringify(sanitizeFixtureValue(JSON.parse(text), undefined, undefined, state));
  } catch {
    return sanitizeString(text, undefined, undefined, state);
  }
}

function sanitizeFixtureValue(
  value: unknown,
  key: string | undefined,
  parent: unknown,
  state: SanitizerState,
): unknown {
  if (typeof value === "string") {
    if (key === "body") return sanitizeBodyText(value, state);
    return sanitizeString(value, key, parent, state);
  }
  if (Array.isArray(value)) {
    return value.map((child) => sanitizeFixtureValue(child, undefined, undefined, state));
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeFixtureValue(childValue, childKey, value, state);
    }
    return out;
  }
  return value;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, canonical(val)]),
    );
  }
  return value;
}

/**
 * Redacts live Pumble fixture values using the same placeholder contract as
 * the record/replay tooling. The helper is pure for a single input value: each
 * call gets a fresh placeholder map while preserving repeated IDs, emails, and
 * names inside that value.
 */
export function sanitizePumbleFixtureValue(value: unknown): unknown {
  return sanitizeFixtureValue(value, undefined, undefined, createSanitizerState());
}

/**
 * Creates the stable SHA-256 body hash used by Pumble replay fixtures.
 * Object keys are sorted recursively before hashing so structurally identical
 * JSON bodies produce the same digest regardless of key insertion order.
 */
export function createFixtureBodyHash(body: unknown): string {
  const serialised = body === undefined ? "" : JSON.stringify(canonical(body));
  return createHash("sha256").update(serialised).digest("hex");
}
