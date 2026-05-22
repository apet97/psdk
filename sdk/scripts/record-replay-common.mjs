import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function fixtureNameToPath(name) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(`Invalid fixture name '${name}' — use only letters, numbers, dot, underscore, or dash`);
  }
  const baseName = name.endsWith(".jsonl") ? name : `${name}.jsonl`;
  const root = process.env.PUMBLE_FIXTURE_DIR
    ? resolve(process.env.PUMBLE_FIXTURE_DIR)
    : resolve(__dirname, "../tests/fixtures");
  mkdirSync(root, { recursive: true });
  return resolve(root, baseName);
}

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, canonical(val)]),
    );
  }
  return value;
}

export function parseBody(text) {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const idMap = new Map();
const emailMap = new Map();
const userNameMap = new Map();
const nameMap = new Map();
const realIdPattern = /\b(?!0{20}\d{4}\b)(?!a{20}\d{4}\b)(?!b{20}\d{4}\b)(?!c{20}\d{4}\b)(?!d{20}\d{4}\b)[0-9a-f]{24}\b/gi;
const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const textFields = new Set(["text", "tx", "description", "title", "phone", "code"]);
const jsonContentTypes = new Set(["application/json", "application/problem+json"]);

function nextPlaceholder(map, value, prefix, suffix = "") {
  if (!map.has(value)) map.set(value, `${prefix}${map.size + 1}${suffix}`);
  return map.get(value);
}

function sanitizeId(value) {
  const existing = value.match(/^(?:0{20}|a{20}|b{20}|c{20}|d{20})\d{4}$/);
  if (existing) return value;
  if (!idMap.has(value)) {
    idMap.set(value, String(idMap.size + 1).padStart(24, "0"));
  }
  return idMap.get(value);
}

function sanitizeEmail(value) {
  if (value.endsWith("@example.invalid")) return value;
  return nextPlaceholder(emailMap, value, "user-", "@example.invalid");
}

function sanitizeName(value, parent) {
  if (/^example-name-[0-9a-f]{8}$/i.test(value)) return value;
  const userKey = typeof parent?.email === "string" ? sanitizeEmail(parent.email) : parent?.id ?? value;
  if (parent && ("email" in parent || "role" in parent || "timeZoneId" in parent)) {
    return nextPlaceholder(userNameMap, String(userKey), "User ");
  }
  if (value.startsWith("sdk-livetest")) return "sdk-livetest-redacted";
  if (!nameMap.has(value)) {
    const digest = createHash("sha256").update(value).digest("hex").slice(0, 8);
    nameMap.set(value, `example-name-${digest}`);
  }
  return nameMap.get(value);
}

export function sanitizeString(value, key, parent) {
  if (key === "email") return sanitizeEmail(value);
  if (key === "fullPath" || key === "scaledPath") return "https://example.invalid/redacted-avatar.png";
  if (key === "name") return sanitizeName(value, parent);
  if (textFields.has(key)) return value.length === 0 ? "" : "[redacted]";
  return value
    .replace(emailPattern, (match) => sanitizeEmail(match))
    .replace(realIdPattern, (match) => sanitizeId(match));
}

export function sanitizeFixtureValue(value, key, parent) {
  if (typeof value === "string") {
    if (key === "body") return sanitizeBodyText(value);
    return sanitizeString(value, key, parent);
  }
  if (Array.isArray(value)) return value.map((v) => sanitizeFixtureValue(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeFixtureValue(childValue, childKey, value);
    }
    return out;
  }
  return value;
}

export function sanitizeAuditBody(value) {
  return sanitizeAuditValue(value);
}

function sanitizeAuditValue(value, key, parent) {
  if (typeof value === "string" && key === "status") return value.length === 0 ? "" : "[redacted]";
  if (Array.isArray(value)) return value.map((v) => sanitizeAuditValue(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeAuditValue(childValue, childKey, value);
    }
    return out;
  }
  return sanitizeFixtureValue(value, key, parent);
}

function sanitizeBodyText(text) {
  if (text === "") return text;
  try {
    return JSON.stringify(sanitizeFixtureValue(JSON.parse(text)));
  } catch {
    return sanitizeString(text);
  }
}

function pickDefined(value, keys) {
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of keys) {
    if (value[key] !== undefined) out[key] = value[key];
  }
  return out;
}

function firstItems(value, count) {
  return Array.isArray(value) ? value.slice(0, count) : [];
}

function minimalChannel(value) {
  return pickDefined(value, ["id", "name", "channelType", "workspaceId"]);
}

function minimalChannelEntry(value) {
  return {
    channel: minimalChannel(value?.channel),
    ...(Array.isArray(value?.users) ? { users: firstItems(value.users, 3) } : {}),
  };
}

function minimalUser(value) {
  return pickDefined(value, [
    "id",
    "email",
    "name",
    "role",
    "status",
    "workspaceId",
    "isAddonBot",
    "isPumbleBot",
  ]);
}

function minimalUserGroup(value) {
  return pickDefined(value, ["id", "name", "handle", "workspaceId", "workspaceUserIds"]);
}

function minimalMessage(value) {
  return pickDefined(value, [
    "id",
    "channelId",
    "workspaceId",
    "author",
    "text",
    "timestamp",
    "timestampMilli",
    "threadRootInfo",
    "threadReplyInfo",
  ]);
}

function minimalSearchHit(value) {
  return pickDefined(value, [
    "id",
    "channelId",
    "workspaceId",
    "author",
    "text",
    "timestamp",
    "timestampMilli",
  ]);
}

function minimalScheduledMessage(value) {
  return pickDefined(value, ["id", "channelId", "workspaceId", "author", "text", "sendAt"]);
}

function minimalError(value) {
  return pickDefined(value, ["error", "message", "localizedMessage", "code"]);
}

function endpointPath(entry) {
  const path = entry?.request?.path ?? entry?.key?.path ?? "";
  return String(path).split("?")[0];
}

function hasJsonContent(entry) {
  const contentType = entry?.response?.headers?.["content-type"] ?? "";
  return String(contentType)
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function minimizeResponseBody(entry, body) {
  if (entry?.response?.status >= 400) return minimalError(body);

  switch (endpointPath(entry)) {
    case "/myInfo":
      return minimalUser(body);
    case "/listUsers":
      return firstItems(body, 3).map(minimalUser);
    case "/listUserGroups":
      return firstItems(body, 3).map(minimalUserGroup);
    case "/listChannels":
      return firstItems(body, 1).map(minimalChannelEntry);
    case "/getChannel":
      return {
        channel: minimalChannel(body?.channel),
        ...(Array.isArray(body?.users) ? { users: firstItems(body.users, 3) } : {}),
      };
    case "/createChannel":
      return minimalChannel(body);
    case "/sendMessage":
    case "/sendReply":
    case "/dmUser":
    case "/dmGroup":
    case "/fetchMessage":
      return minimalMessage(body);
    case "/fetchThreadReplies":
    case "/listMessages":
      return {
        messages: firstItems(body?.messages, 1).map(minimalMessage),
        ...(body?.hasMoreBefore !== undefined ? { hasMoreBefore: body.hasMoreBefore } : {}),
        ...(body?.hasMoreAfter !== undefined ? { hasMoreAfter: body.hasMoreAfter } : {}),
      };
    case "/searchMessages":
      return {
        content: firstItems(body?.content, body?.content?.length ?? 0).map(minimalSearchHit),
        totalElements: body?.totalElements ?? 0,
        hasMore: body?.hasMore ?? false,
      };
    case "/createScheduledMessage":
    case "/fetchScheduledMessage":
    case "/editScheduledMessage":
      return minimalScheduledMessage(body);
    case "/fetchScheduledMessages":
      return {
        scheduledMessages: firstItems(body?.scheduledMessages, 1).map(minimalScheduledMessage),
        hasMore: body?.hasMore ?? false,
      };
    default:
      return body;
  }
}

function minimizeResponseBodyText(entry) {
  const body = entry?.response?.body;
  if (typeof body !== "string" || body === "") return;
  if (!jsonContentTypes.has(hasJsonContent(entry))) return;
  try {
    entry.response.body = JSON.stringify(minimizeResponseBody(entry, JSON.parse(body)));
  } catch {
    // Keep the sanitized body if the response was not valid JSON.
  }
}

export function bodyHash(body) {
  const serialised = body === undefined ? "" : JSON.stringify(canonical(body));
  return createHash("sha256").update(serialised).digest("hex");
}

export function normalisePath(urlLike) {
  const url = new URL(urlLike);
  const params = [...url.searchParams.entries()]
    .sort(([ak, av], [bk, bv]) => ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk));
  const search = params.length > 0
    ? `?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`
    : "";
  return `${url.pathname}${search}`;
}

export function headersToObject(headers) {
  return Object.fromEntries([...headers.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function redactHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    out[lower] = lower === "authorization" || lower === "apikey" || lower === "x-addon-token" || lower === "x-api-key" || lower === "cookie"
      ? "<redacted>"
      : sanitizeString(String(value), lower);
  }
  return out;
}

export function sanitizeResponseHeaders(headers) {
  const redacted = redactHeaders(headers);
  const out = {};
  for (const key of ["content-type", "retry-after", "x-test"]) {
    if (key in redacted) out[key] = redacted[key];
  }
  return out;
}

export function sanitizeFixtureEntry(entry) {
  if (entry?.type === "meta") {
    return {
      type: "meta",
      name: entry.name,
      value: sanitizeFixtureValue(entry.value),
    };
  }
  const out = sanitizeFixtureValue(entry);
  if (out?.type === "http" && out.request && out.key) {
    out.key.method = out.request.method ?? out.key.method;
    out.key.path = out.request.path ?? out.key.path;
    out.key.bodyHash = bodyHash(out.request.body);
    if (out.response?.headers) {
      out.response.headers = sanitizeResponseHeaders(out.response.headers);
    }
    minimizeResponseBodyText(out);
  }
  return out;
}

export async function requestSnapshot(input, init) {
  const req = new Request(input, init);
  const bodyText = await req.clone().text();
  const body = sanitizeFixtureValue(parseBody(bodyText));
  const method = req.method.toUpperCase();
  const path = sanitizeString(normalisePath(req.url));
  return {
    fetchRequest: req,
    key: { method, path, bodyHash: bodyHash(body) },
    request: {
      method,
      url: sanitizeString(req.url),
      path,
      headers: redactHeaders(headersToObject(req.headers)),
      body,
    },
  };
}

export function keyId(key) {
  return `${key.method}\n${key.path}\n${key.bodyHash}`;
}

export function formatArazzoContextSummary(ctx, options = {}) {
  const redactValues = options.redactValues ?? true;
  return ["self", "user2", "user3", "channel", "message", "scheduled"]
    .map((key) => `${key}=${redactValues ? "<redacted>" : ctx[key]}`)
    .join(" ");
}
