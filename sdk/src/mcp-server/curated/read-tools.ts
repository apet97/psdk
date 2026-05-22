import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import { getThreadContext as fetchThreadContext } from "../../extensions/thread-context.js";
import type { RequestOptions } from "../../lib/sdks.js";
import type { Message } from "../../models/message.js";
import type { SearchHit } from "../../models/search-hit.js";
import type {
  FetchMessageRequest,
  FetchThreadRepliesRequest,
  ListMessagesRequest,
  SearchMessagesRequest,
} from "../../models/operations/index.js";
import type { CuratedClient } from "./types.js";

const DEFAULT_READ_LIMIT = 10;
const MAX_READ_LIMIT = 50;

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

type MessageLike = Pick<
  Message | SearchHit,
  | "author"
  | "authorAppId"
  | "channelId"
  | "id"
  | "text"
  | "timestamp"
  | "timestampMilli"
  | "workspaceId"
> & {
  threadReplyInfo?: { rootId?: string | undefined } | null | undefined;
  threadRootInfo?: {
    lastReplyTimestampMilli?: number | undefined;
    replyCount?: number | undefined;
  } | null | undefined;
};

interface CompactActor {
  id: string;
  appId?: string;
}

interface CompactTarget {
  channelId: string;
  workspaceId?: string;
}

interface CompactThread {
  lastReplyTimestampMilli?: number;
  replyCount?: number;
  rootMessageId?: string;
}

interface CompactMessage {
  id: string;
  text: string;
  timestamp: string;
  timestampMilli: number;
  actor: CompactActor;
  target: CompactTarget;
  thread?: CompactThread;
}

const nonBlank = z.string().trim().min(1);
const boundedLimit = z.number().int().min(1).max(MAX_READ_LIMIT)
  .default(DEFAULT_READ_LIMIT);

const searchMessagesSchema = {
  text: nonBlank.optional(),
  from: z.array(nonBlank).min(1).optional(),
  in: z.array(nonBlank).min(1).optional(),
  limit: boundedLimit,
  strategy: z.enum(["MOST_RELEVANT", "MOST_RECENT", "NEWEST", "OLDEST"]).optional(),
  beforeTs: z.number().int().optional(),
  afterTs: z.number().int().optional(),
} satisfies z.ZodRawShape;

const getMessageSchema = {
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  messageId: nonBlank,
} satisfies z.ZodRawShape;

const listChannelMessagesSchema = {
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  cursor: nonBlank.optional(),
  limit: boundedLimit,
  strategy: z.enum(["BEFORE", "AFTER", "AROUND"]).optional(),
} satisfies z.ZodRawShape;

const listThreadRepliesSchema = {
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  cursor: nonBlank.optional(),
  limit: boundedLimit,
  rootMessageId: nonBlank,
} satisfies z.ZodRawShape;

const getThreadContextSchema = {
  channelId: nonBlank,
  messageId: nonBlank,
  replyLimit: boundedLimit,
} satisfies z.ZodRawShape;

type SearchMessagesArgs = z.infer<z.ZodObject<typeof searchMessagesSchema>>;
type GetMessageArgs = z.infer<z.ZodObject<typeof getMessageSchema>>;
type ListChannelMessagesArgs = z.infer<z.ZodObject<typeof listChannelMessagesSchema>>;
type ListThreadRepliesArgs = z.infer<z.ZodObject<typeof listThreadRepliesSchema>>;
type GetThreadContextArgs = z.infer<z.ZodObject<typeof getThreadContextSchema>>;

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function jsonTool(run: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonResult(await run());
  } catch (error) {
    return errorResult(error);
  }
}

function requestOptions(ctx: ToolExtra): RequestOptions | undefined {
  return ctx.signal === undefined ? undefined : { signal: ctx.signal };
}

function requireTarget(
  toolName: string,
  args: { channel?: string | undefined; channelId?: string | undefined },
): void {
  if (args.channelId === undefined && args.channel === undefined) {
    throw new Error(`${toolName}: channelId or channel is required`);
  }
}

function compactActor(author: string, authorAppId: string | null | undefined): CompactActor {
  const actor: CompactActor = { id: author };
  if (authorAppId !== undefined && authorAppId !== null && authorAppId.length > 0) {
    actor.appId = authorAppId;
  }
  return actor;
}

function compactTarget(channelId: string, workspaceId: string | undefined): CompactTarget {
  const target: CompactTarget = { channelId };
  if (workspaceId !== undefined && workspaceId.length > 0) {
    target.workspaceId = workspaceId;
  }
  return target;
}

function compactThread(message: MessageLike): CompactThread | undefined {
  const thread: CompactThread = {};
  if (message.threadRootInfo?.replyCount !== undefined) {
    thread.replyCount = message.threadRootInfo.replyCount;
  }
  if (message.threadRootInfo?.lastReplyTimestampMilli !== undefined) {
    thread.lastReplyTimestampMilli = message.threadRootInfo.lastReplyTimestampMilli;
  }
  if (message.threadReplyInfo?.rootId !== undefined) {
    thread.rootMessageId = message.threadReplyInfo.rootId;
  }
  return Object.keys(thread).length === 0 ? undefined : thread;
}

function compactMessage(message: MessageLike): CompactMessage {
  const compact: CompactMessage = {
    id: message.id,
    text: message.text,
    timestamp: message.timestamp.toISOString(),
    timestampMilli: message.timestampMilli,
    actor: compactActor(message.author, message.authorAppId),
    target: compactTarget(message.channelId, message.workspaceId),
  };
  const thread = compactThread(message);
  if (thread !== undefined) {
    compact.thread = thread;
  }
  return compact;
}

function compactThreadContextMessage(message: {
  author: string;
  channelId: string;
  id: string;
  text: string;
  timestamp: string;
  timestampMilli: number;
}): CompactMessage {
  return {
    id: message.id,
    text: message.text,
    timestamp: message.timestamp,
    timestampMilli: message.timestampMilli,
    actor: { id: message.author },
    target: { channelId: message.channelId },
  };
}

function searchMessagesRequest(args: SearchMessagesArgs): SearchMessagesRequest {
  if (args.text === undefined && args.from === undefined && args.in === undefined) {
    throw new Error("search_messages: text, from, or in is required");
  }

  const request: SearchMessagesRequest = { limit: args.limit };
  if (args.text !== undefined) request.text = args.text;
  if (args.from !== undefined) request.from = args.from;
  if (args.in !== undefined) request.in = args.in;
  if (args.strategy !== undefined) request.strategy = args.strategy;
  if (args.beforeTs !== undefined) request.beforeTs = args.beforeTs;
  if (args.afterTs !== undefined) request.afterTs = args.afterTs;
  return request;
}

function getMessageRequest(args: GetMessageArgs): FetchMessageRequest {
  requireTarget("get_message", args);

  const request: FetchMessageRequest = { messageId: args.messageId };
  if (args.channelId !== undefined) request.channelId = args.channelId;
  if (args.channel !== undefined) request.channel = args.channel;
  return request;
}

function listMessagesRequest(args: ListChannelMessagesArgs): ListMessagesRequest {
  requireTarget("list_channel_messages", args);

  const request: ListMessagesRequest = { limit: args.limit };
  if (args.channelId !== undefined) request.channelId = args.channelId;
  if (args.channel !== undefined) request.channel = args.channel;
  if (args.cursor !== undefined) request.cursor = args.cursor;
  if (args.strategy !== undefined) request.strategy = args.strategy;
  return request;
}

function threadRepliesRequest(args: ListThreadRepliesArgs): FetchThreadRepliesRequest {
  requireTarget("list_thread_replies", args);

  const request: FetchThreadRepliesRequest = {
    limit: args.limit,
    rootMessageId: args.rootMessageId,
  };
  if (args.channelId !== undefined) request.channelId = args.channelId;
  if (args.channel !== undefined) request.channel = args.channel;
  if (args.cursor !== undefined) request.cursor = args.cursor;
  return request;
}

export function registerCuratedReadTools(
  server: McpServer,
  client: CuratedClient,
): void {
  server.tool(
    "search_messages",
    "Search messages by text, actor, channel, or bounded time window.",
    searchMessagesSchema,
    async (args: SearchMessagesArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request = searchMessagesRequest(args);
        const page = await client.messages.searchMessages(request, requestOptions(ctx));
        return {
          messages: page.result.content.map(compactMessage),
          page: {
            limit: request.limit,
            totalElements: page.result.totalElements,
            hasMore: page.result.hasMore,
          },
        };
      }),
  );

  server.tool(
    "get_message",
    "Fetch one message by message id and channel identity.",
    getMessageSchema,
    async (args: GetMessageArgs, ctx: ToolExtra) =>
      jsonTool(async () =>
        compactMessage(await client.messages.fetchMessage(
          getMessageRequest(args),
          requestOptions(ctx),
        ))
      ),
  );

  server.tool(
    "list_channel_messages",
    "List one bounded page of messages from a channel.",
    listChannelMessagesSchema,
    async (args: ListChannelMessagesArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request = listMessagesRequest(args);
        const page = await client.messages.listMessages(request, requestOptions(ctx));
        return {
          messages: page.result.messages.map(compactMessage),
          page: {
            limit: request.limit,
            hasMoreBefore: page.result.hasMoreBefore,
            hasMoreAfter: page.result.hasMoreAfter,
          },
        };
      }),
  );

  server.tool(
    "list_thread_replies",
    "List one bounded page of replies from a thread.",
    listThreadRepliesSchema,
    async (args: ListThreadRepliesArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request = threadRepliesRequest(args);
        const page = await client.messages.fetchThreadReplies(request, requestOptions(ctx));
        return {
          replies: page.result.map(compactMessage),
          page: { limit: request.limit },
        };
      }),
  );

  server.tool(
    "get_thread_context",
    "Fetch a thread root and one bounded page of replies.",
    getThreadContextSchema,
    async (args: GetThreadContextArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const context = await fetchThreadContext(
          client,
          {
            channelId: args.channelId,
            messageId: args.messageId,
            replyLimit: args.replyLimit,
          },
          requestOptions(ctx),
        );
        return {
          root: compactThreadContextMessage(context.root),
          replies: context.replies.map(compactThreadContextMessage),
          participants: context.participants,
          replyCount: context.replyCount,
          page: { replyLimit: args.replyLimit },
        };
      }),
  );
}
