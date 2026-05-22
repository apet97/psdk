import {
  createFixtureBodyHash,
  sanitizePumbleFixtureValue,
} from "./fixtures.js";

type FixtureKey = {
  readonly method: string;
  readonly path: string;
  readonly bodyHash: string;
};

export type MockPumbleFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface MockPumbleFetchRequest {
  /** HTTP method to match. Defaults to GET. */
  method?: string;
  /** Absolute URL or path with optional query parameters. Query pairs are sorted before matching. */
  path: string | URL;
  /** Request body to sanitize, canonicalize, and hash when bodyHash is not supplied. */
  body?: unknown;
  /** Precomputed fixture body hash, useful when loading existing replay entries. */
  bodyHash?: string;
}

export interface MockPumbleFetchKey {
  /** HTTP method to match. Defaults to GET. */
  method?: string;
  /** Absolute URL or path with optional query parameters. Query pairs are sorted before matching. */
  path: string | URL;
  /** Precomputed fixture body hash. */
  bodyHash?: string;
}

export interface MockPumbleFetchResponse {
  /** HTTP status for the returned Response. Defaults to 200. */
  status?: number;
  /** HTTP status text for the returned Response. */
  statusText?: string;
  /** Response headers. JSON bodies get application/json when no content-type is supplied. */
  headers?: HeadersInit;
  /** Response body. Plain objects and arrays are JSON-stringified. */
  body?: unknown;
}

export interface MockPumbleFetchFixture {
  /** Replay-style key. Used when request is omitted or a precomputed bodyHash is desired. */
  key?: MockPumbleFetchKey;
  /** Request matcher. */
  request?: MockPumbleFetchRequest;
  /** Response object or response configuration returned for this fixture entry. */
  response: Response | MockPumbleFetchResponse;
}

export interface CreateMockPumbleFetchOptions {
  /** Base URL used when callers pass relative request URLs. */
  baseUrl?: string;
}

const defaultBaseUrl = "https://pumble.example.invalid";

function keyId(key: FixtureKey): string {
  return `${key.method}\n${key.path}\n${key.bodyHash}`;
}

function normalizePath(urlLike: string | URL, baseUrl: string): string {
  const url = new URL(String(urlLike), baseUrl);
  const params = [...url.searchParams.entries()]
    .sort(([ak, av], [bk, bv]) => ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk));
  const search = params.length > 0
    ? `?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`
    : "";
  const sanitized = sanitizePumbleFixtureValue(`${url.pathname}${search}`);
  return typeof sanitized === "string" ? sanitized : `${url.pathname}${search}`;
}

function parseBody(text: string): unknown {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function fixtureKey(fixture: MockPumbleFetchFixture, baseUrl: string): FixtureKey {
  const path = fixture.request?.path ?? fixture.key?.path;
  if (!path) {
    throw new Error("Mock Pumble fixture requires request.path or key.path");
  }
  const method = (fixture.request?.method ?? fixture.key?.method ?? "GET").toUpperCase();
  const bodyHash = fixture.request?.bodyHash
    ?? fixture.key?.bodyHash
    ?? createFixtureBodyHash(sanitizePumbleFixtureValue(fixture.request?.body));
  return {
    method,
    path: normalizePath(path, baseUrl),
    bodyHash,
  };
}

function toRequestInput(input: RequestInfo | URL, baseUrl: string): RequestInfo | URL {
  if (typeof input === "string") return new URL(input, baseUrl).href;
  return input;
}

async function requestKey(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  baseUrl: string,
): Promise<FixtureKey> {
  const request = new Request(toRequestInput(input, baseUrl), init);
  const body = sanitizePumbleFixtureValue(parseBody(await request.clone().text()));
  return {
    method: request.method.toUpperCase(),
    path: normalizePath(request.url, baseUrl),
    bodyHash: createFixtureBodyHash(body),
  };
}

function isBodyInit(value: unknown): value is BodyInit {
  return typeof value === "string"
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || (typeof Blob !== "undefined" && value instanceof Blob)
    || (typeof FormData !== "undefined" && value instanceof FormData)
    || (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams)
    || (typeof ReadableStream !== "undefined" && value instanceof ReadableStream);
}

function responseBody(
  value: unknown,
  headers: Headers,
): BodyInit | null {
  if (value === undefined) return "";
  if (value === null) return null;
  if (isBodyInit(value)) return value;
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  return JSON.stringify(value);
}

function createResponse(response: Response | MockPumbleFetchResponse): Response {
  if (typeof Response !== "undefined" && response instanceof Response) {
    return response.clone();
  }
  const headers = new Headers(response.headers);
  const init: ResponseInit = {
    status: response.status ?? 200,
    headers,
  };
  if (response.statusText !== undefined) init.statusText = response.statusText;
  return new Response(responseBody(response.body, headers), init);
}

/**
 * Creates a fetch implementation backed by in-memory Pumble fixture entries.
 * Requests are matched FIFO by method, normalized/sorted path, and sanitized
 * structural body hash. Misses throw and never fall through to global fetch,
 * making the helper safe for SDK tests without live credentials.
 */
export function createMockPumbleFetch(
  fixtures: readonly MockPumbleFetchFixture[],
  options: CreateMockPumbleFetchOptions = {},
): MockPumbleFetch {
  const baseUrl = options.baseUrl ?? defaultBaseUrl;
  const entries = new Map<string, MockPumbleFetchFixture[]>();

  for (const fixture of fixtures) {
    const id = keyId(fixtureKey(fixture, baseUrl));
    const bucket = entries.get(id) ?? [];
    bucket.push(fixture);
    entries.set(id, bucket);
  }

  return async (input, init) => {
    const key = await requestKey(input, init, baseUrl);
    const id = keyId(key);
    const bucket = entries.get(id);
    const fixture = bucket?.shift();
    if (!fixture) {
      const registered = [...entries.keys()].sort().join(", ") || "none";
      throw new Error(
        `Mock Pumble fetch miss for ${key.method} ${key.path} bodyHash=${key.bodyHash}; registered=${registered}`,
      );
    }
    return createResponse(fixture.response);
  };
}
