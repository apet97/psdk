const SECRET_KEY_PATTERN = /api[-_ ]?key|authorization|token|secret|password|cookie|signature/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const HEX_ID_PATTERN = /\b[0-9a-f]{24}\b/gi;
const BODY_TEXT_KEYS = new Set(["text", "tx", "message", "description"]);

export function redactDebugHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    out[lower] = SECRET_KEY_PATTERN.test(lower) ? "<redacted>" : redactDebugString(value);
  }
  return out;
}

export function redactDebugValue(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (SECRET_KEY_PATTERN.test(key) || BODY_TEXT_KEYS.has(key)) return "<redacted>";
    return redactDebugString(value);
  }

  if (Array.isArray(value)) return value.map((item) => redactDebugValue(item, key));

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = redactDebugValue(childValue, childKey);
    }
    return out;
  }

  return value;
}

function redactDebugString(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "<redacted>")
    .replace(HEX_ID_PATTERN, "<redacted>");
}
