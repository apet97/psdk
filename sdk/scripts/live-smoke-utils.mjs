import { categorizeError } from "../esm/extensions/index.js";

const SECRET_KEY_RE = /(api[-_ ]?key|apikey|access[-_ ]?token|refresh[-_ ]?token|token|secret|password)/i;
const ID_KEY_RE = /(^id$|id$|ids$)/i;
const EMAIL_KEY_RE = /email/i;
const EMAIL_VALUE_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const HEX_ID_VALUE_RE = /\b[0-9a-f]{24}\b/gi;
const SECRET_VALUE_RE = /\b(?:sk|pk|pumble)[A-Za-z0-9_-]*_[A-Za-z0-9_-]{8,}\b/g;

export async function runSearchSmoke({ searchRecent, query }) {
  const result = await searchRecent({ query, limit: 5 });
  if (!result?.ok) {
    throw new Error(`search.recent failed: ${result?.summary ?? JSON.stringify(result)}`);
  }
  if (!Array.isArray(result.data)) {
    throw new Error("search.recent returned no data array");
  }
  return result;
}

export async function runLiveOperation(name, context, operation) {
  try {
    return await operation();
  } catch (error) {
    const categorized = categorizeError(error);
    const safeContext = redactLiveValue(context ?? {});
    const message = [
      `${name} failed [${categorized.category}]`,
      `retryable=${categorized.retryable}`,
      categorized.statusCode === null ? undefined : `status=${categorized.statusCode}`,
      `message=${redactLiveString(categorized.message)}`,
      `context=${JSON.stringify(safeContext)}`,
    ].filter(Boolean).join(" ");
    throw new Error(message, { cause: error });
  }
}

export function redactLiveValue(value, key = "") {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (SECRET_KEY_RE.test(key) || ID_KEY_RE.test(key) || EMAIL_KEY_RE.test(key)) {
      return "<redacted>";
    }
    return redactLiveString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => redactLiveValue(item, key));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactLiveValue(entryValue, entryKey),
      ]),
    );
  }
  return "<redacted>";
}

function redactLiveString(value) {
  return value
    .replace(EMAIL_VALUE_RE, "<redacted>")
    .replace(HEX_ID_VALUE_RE, "<redacted>")
    .replace(SECRET_VALUE_RE, "<redacted>");
}

export function selectDmRecipient(users, selfId) {
  return users.find((user) =>
    user.id !== selfId &&
    Boolean(user.email) &&
    user.status === "ACTIVATED" &&
    user.role !== "GUEST" &&
    !user.isPumbleBot &&
    !user.isAddonBot
  );
}
