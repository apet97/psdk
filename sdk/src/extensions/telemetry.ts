// Lightweight telemetry layer for the SDK + MCP wrapper.
//
// Three building blocks, composable but independent:
//
//   1. createOTelSpanRecorder(options) — uses `@opentelemetry/api` when the
//      consumer has it installed; otherwise returns a no-op recorder. Each
//      SDK call becomes a span with status / duration / status_code / error
//      attributes.
//
//   2. createJsonlAuditWriter(path) — appends one JSON line per event to a
//      file. Used both by the SDK-level wrapClient (logical method calls)
//      and by the MCP wrapper's fetch shims (raw HTTP). Writes are
//      fire-and-forget, chained on a promise so order is preserved.
//
//   3. wrapClient(sdk, options) — Proxy-wraps an SDK instance so every
//      method call emits a recorder span + (optional) JSONL entry. The
//      wrapped object satisfies the same TypeScript type as the input;
//      sub-clients (`sdk.messages`, etc.) are wrapped lazily on access.
//
// None of this is a hard dependency. The whole module degrades to no-ops
// when neither a recorder nor a writer is supplied.

import { appendFile } from "node:fs/promises";
import { createRequire } from "node:module";

/* -------------------------------------------------------------------------- */
/* Recorders                                                                  */
/* -------------------------------------------------------------------------- */

export interface SpanStatus {
  ok: boolean;
  statusCode?: number;
  errorClass?: string;
}

export interface RecorderSpan {
  end(): void;
  setStatus(status: SpanStatus): void;
  setAttributes?(attrs: Record<string, unknown>): void;
}

export interface SpanRecorder {
  startSpan(op: string, attrs?: Record<string, unknown>): RecorderSpan;
}

export interface OTelRecorderOptions {
  /** Tracer name passed to `trace.getTracer`. Defaults to "pumble-sdk". */
  tracerName?: string;
  /** Tracer version. */
  tracerVersion?: string;
}

/** Loaded `@opentelemetry/api` module, or null if not installed. */
function loadOTelApi(): unknown | null {
  try {
    // createRequire so we can resolve CJS/ESM modules from inside an ESM
    // file. @opentelemetry/api ships CJS, so this is the simple path.
    const requireCjs = createRequire(import.meta.url);
    return requireCjs("@opentelemetry/api");
  } catch {
    return null;
  }
}

/**
 * Span recorder backed by `@opentelemetry/api`. If the module isn't
 * installed in the consumer's `node_modules`, this returns the same
 * no-op recorder as {@link createNoopRecorder}. Either way the returned
 * object satisfies {@link SpanRecorder}.
 */
export function createOTelSpanRecorder(options: OTelRecorderOptions = {}): SpanRecorder {
  const api = loadOTelApi() as {
    trace: {
      getTracer: (name: string, version?: string) => {
        startSpan: (
          name: string,
          opts?: { attributes?: Record<string, unknown> },
        ) => {
          end: () => void;
          setStatus: (s: { code: number; message?: string }) => void;
          setAttribute: (k: string, v: unknown) => void;
        };
      };
    };
    SpanStatusCode: { OK: number; ERROR: number };
  } | null;

  if (!api) return createNoopRecorder();

  const tracer = api.trace.getTracer(
    options.tracerName ?? "pumble-sdk",
    options.tracerVersion,
  );

  return {
    startSpan(op, attrs) {
      const span = tracer.startSpan(op, { attributes: attrs ?? {} });
      return {
        end() { span.end(); },
        setStatus({ ok, statusCode, errorClass }) {
          if (ok) {
            span.setStatus({ code: api.SpanStatusCode.OK });
          } else {
            span.setStatus({
              code: api.SpanStatusCode.ERROR,
              message: errorClass ?? `status ${statusCode ?? "unknown"}`,
            });
          }
          if (typeof statusCode === "number") {
            span.setAttribute("http.status_code", statusCode);
          }
          if (errorClass) {
            span.setAttribute("error.class", errorClass);
          }
        },
        setAttributes(extra) {
          for (const [k, v] of Object.entries(extra)) span.setAttribute(k, v);
        },
      };
    },
  };
}

/** No-op {@link SpanRecorder}. Useful when only JSONL auditing is wanted. */
export function createNoopRecorder(): SpanRecorder {
  return {
    startSpan() {
      return {
        end() { /* noop */ },
        setStatus() { /* noop */ },
        setAttributes() { /* noop */ },
      };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* JSONL writer                                                               */
/* -------------------------------------------------------------------------- */

export interface JsonlEvent {
  ts: string;
  op: string;
  durationMs?: number;
  statusCode?: number | null;
  errorClass?: string;
  [k: string]: unknown;
}

export interface JsonlAuditWriter {
  /** Append one event. Fire-and-forget — never throws into the caller. */
  write(event: JsonlEvent): void;
  /** Resolve when all queued writes have flushed. */
  flush(): Promise<void>;
}

/**
 * Create an append-only JSONL writer. Writes are queued on a single
 * promise chain so events land in the order they were submitted, and
 * I/O errors are logged once to stderr instead of being re-thrown into
 * the SDK call path.
 */
export function createJsonlAuditWriter(path: string): JsonlAuditWriter {
  let chain: Promise<void> = Promise.resolve();
  let warned = false;
  function write(event: JsonlEvent) {
    const line = JSON.stringify(event) + "\n";
    chain = chain
      .then(() => appendFile(path, line, { encoding: "utf8" }))
      .catch((err: unknown) => {
        if (!warned) {
          warned = true;
          process.stderr.write(
            `[pumble-sdk] audit-log write failed (${path}): ${String((err as Error)?.message ?? err)}\n`,
          );
        }
      });
  }
  return {
    write,
    async flush() { await chain; },
  };
}

/* -------------------------------------------------------------------------- */
/* Client proxy                                                               */
/* -------------------------------------------------------------------------- */

export interface WrapClientOptions {
  /** Span recorder. Defaults to a no-op. */
  recorder?: SpanRecorder;
  /** JSONL writer. Omit to skip on-disk auditing. */
  writer?: JsonlAuditWriter;
  /** Clock for audit timestamps. Defaults to `() => new Date().toISOString()`. */
  now?: () => string;
  /** Filter — return false to skip instrumentation for a given dotted op. */
  shouldRecord?: (op: string) => boolean;
  /**
   * Summarise method args before they land in the audit log. Defaults
   * to a conservative summary that strips message bodies and only
   * surfaces well-known identifier fields.
   */
  summariseArgs?: (op: string, args: readonly unknown[]) => unknown;
}

/**
 * Wrap any object (e.g. a `PumbleSdk` instance) so every method call —
 * including methods on its sub-clients — emits a span + audit entry.
 *
 * The proxy is transparent: `wrapClient(sdk).messages.sendMessage(...)`
 * behaves identically to the unwrapped call, but with a span around it
 * and (if a writer is supplied) a JSONL line per call.
 */
export function wrapClient<T extends object>(target: T, options: WrapClientOptions = {}): T {
  const recorder = options.recorder ?? createNoopRecorder();
  const now = options.now ?? (() => new Date().toISOString());
  const shouldRecord = options.shouldRecord ?? (() => true);
  const summarise = options.summariseArgs ?? defaultArgsSummary;
  return wrapObject(target, "", recorder, options.writer, now, shouldRecord, summarise) as T;
}

function wrapObject<T extends object>(
  target: T,
  prefix: string,
  recorder: SpanRecorder,
  writer: JsonlAuditWriter | undefined,
  now: () => string,
  shouldRecord: (op: string) => boolean,
  summarise: (op: string, args: readonly unknown[]) => unknown,
): T {
  const cache = new Map<PropertyKey, unknown>();
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop !== "string") return Reflect.get(obj, prop, receiver);
      if (cache.has(prop)) return cache.get(prop);

      const raw = Reflect.get(obj, prop, obj);
      const opName = prefix ? `${prefix}.${prop}` : prop;

      if (typeof raw === "function") {
        const wrapped = function instrumented(this: unknown, ...args: unknown[]) {
          if (!shouldRecord(opName)) {
            return (raw as (...a: unknown[]) => unknown).apply(obj, args);
          }
          const start = performance.now();
          const span = recorder.startSpan(opName);

          const finish = (ok: boolean, err?: unknown) => {
            const durationMs = Math.max(0, performance.now() - start);
            const statusCode = extractStatus(err);
            const errorClass = err instanceof Error ? err.constructor.name : undefined;
            const status: SpanStatus = { ok };
            if (statusCode !== undefined) status.statusCode = statusCode;
            if (errorClass) status.errorClass = errorClass;
            span.setStatus(status);
            span.end();
            if (writer) {
              const event: JsonlEvent = {
                ts: now(),
                op: opName,
                durationMs,
                statusCode: statusCode ?? null,
                args: summarise(opName, args),
              };
              if (errorClass) event["errorClass"] = errorClass;
              writer.write(event);
            }
          };

          let result: unknown;
          try {
            result = (raw as (...a: unknown[]) => unknown).apply(obj, args);
          } catch (err) {
            finish(false, err);
            throw err;
          }
          if (result && typeof (result as Promise<unknown>).then === "function") {
            return (result as Promise<unknown>).then(
              (val) => { finish(true); return val; },
              (err) => { finish(false, err); throw err; },
            );
          }
          finish(true);
          return result;
        };
        cache.set(prop, wrapped);
        return wrapped;
      }

      if (raw && typeof raw === "object") {
        const sub = wrapObject(raw as object, opName, recorder, writer, now, shouldRecord, summarise);
        cache.set(prop, sub);
        return sub;
      }
      cache.set(prop, raw);
      return raw;
    },
  });
}

function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const candidate = (err as { statusCode?: unknown }).statusCode;
  return typeof candidate === "number" ? candidate : undefined;
}

const ID_FIELDS = [
  "channelId",
  "messageId",
  "scheduledMessageId",
  "userId",
  "workspaceId",
  "userGroupId",
  "limit",
  "cursor",
  "beforeTs",
  "afterTs",
  "strategy",
] as const;

function defaultArgsSummary(_op: string, args: readonly unknown[]): unknown {
  return args.map(summariseArg);
}

function summariseArg(a: unknown): unknown {
  if (a == null) return a;
  if (typeof a !== "object") return typeof a;
  const obj = a as Record<string, unknown>;
  const ids: Record<string, unknown> = {};
  for (const k of ID_FIELDS) {
    if (k in obj) ids[k] = obj[k];
  }
  return ids;
}
