// Defensive async-iterator wrapper around messages.listMessages.
//
// Same shape as `searchAllMessages` but for the channel-scrollback
// endpoint. Uses message-id cursors (NOT timestamps) and walks
// backward by default — `hasMoreBefore` is the stop signal.

import type { Message } from "../models/message.js";
import type { ListMessagesRequest } from "../models/operations/list-messages.js";

export interface ListAllClient {
  messages: {
    listMessages(
      request?: ListMessagesRequest,
    ): Promise<ListAllPageResult>;
  };
}

export interface ListAllPageResult {
  result: {
    messages: Message[];
    hasMoreBefore?: boolean | null;
    hasMoreAfter?: boolean | null;
  };
}

export interface ListAllOptions {
  signal?: AbortSignal;
  maxResults?: number;
  maxPages?: number;
  onPage?: (
    page: ListAllPageResult,
    info: { pageIndex: number; newInPage: number; yielded: number },
  ) => void | Promise<void>;
}

class AbortError extends Error {
  override readonly name = "AbortError";
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const reason = (signal as AbortSignal & { reason?: unknown }).reason;
  if (reason instanceof Error) throw reason;
  if (reason !== undefined) throw new AbortError(String(reason));
  throw new AbortError("listAllMessages aborted");
}

/**
 * Walk every message in a channel back through history, deduping by id
 * and stopping when `hasMoreBefore` is false/null.
 *
 * Example:
 *   for await (const m of listAllMessages(sdk, { channelId, limit: 50 })) {
 *     console.log(m.id, m.text);
 *   }
 */
export async function* listAllMessages(
  client: ListAllClient,
  request: ListMessagesRequest = {},
  options: ListAllOptions = {},
): AsyncGenerator<Message, void, void> {
  const { signal, maxResults, onPage } = options;
  const HARD_PAGE_CAP = options.maxPages ?? 10_000;

  const seen = new Set<string>();
  // Default to BEFORE (history scrollback) unless caller overrides.
  const baseReq: ListMessagesRequest = {
    ...request,
    strategy: request.strategy ?? ("BEFORE" as ListMessagesRequest["strategy"]),
  };
  let cursor: string | undefined = request.cursor;
  let prevCursor: string | undefined;
  let pageIndex = 0;
  let yielded = 0;

  while (true) {
    throwIfAborted(signal);
    if (pageIndex >= HARD_PAGE_CAP) {
      throw new Error(
        `listAllMessages: exceeded ${HARD_PAGE_CAP} pages — refusing to continue`,
      );
    }

    const pageReq: ListMessagesRequest = cursor === undefined
      ? baseReq
      : { ...baseReq, cursor };

    const page = await client.messages.listMessages(pageReq);
    pageIndex++;
    throwIfAborted(signal);

    const msgs = page.result?.messages ?? [];
    if (msgs.length === 0) return;

    let newInPage = 0;
    for (const m of msgs) {
      if (typeof m.id === "string" && !seen.has(m.id)) newInPage++;
    }

    if (onPage) {
      await onPage(page, { pageIndex, newInPage, yielded });
      throwIfAborted(signal);
    }

    for (const m of msgs) {
      if (typeof m.id !== "string" || seen.has(m.id)) continue;
      seen.add(m.id);
      yielded++;
      yield m;
      throwIfAborted(signal);
      if (maxResults !== undefined && yielded >= maxResults) return;
    }

    if (newInPage === 0) return;

    // Stop when there's no more history in the walked direction. The
    // strategy decides which flag matters; default-BEFORE looks at
    // hasMoreBefore.
    const strategy = baseReq.strategy;
    const hasMore = strategy === "AFTER"
      ? page.result.hasMoreAfter
      : page.result.hasMoreBefore;
    if (hasMore !== true) return;

    // Cursor advances to the last message id seen (Pumble's convention).
    const lastId = msgs[msgs.length - 1]?.id;
    if (typeof lastId !== "string") return;
    if (prevCursor !== undefined && lastId === prevCursor) return;
    prevCursor = lastId;
    cursor = lastId;
  }
}
