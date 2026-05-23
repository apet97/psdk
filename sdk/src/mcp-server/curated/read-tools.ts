import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import { getThreadContext as fetchThreadContext } from "../../extensions/thread-context.js";
import type { RequestOptions } from "../../lib/sdks.js";
import type { Message } from "../../models/message.js";
import type { ListMessagesRequest, SearchMessagesRequest } from "../../models/operations/index.js";
import type { SearchHit } from "../../models/search-hit.js";
import {
  okPayload,
  jsonTool,
} from "./payloads.js";
import { resolveCuratedChannelTarget } from "./targets.js";
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

const listChannelsSchema = {
  limit: boundedLimit,
} satisfies z.ZodRawShape;

const searchMessagesSchema = {
  text: nonBlank.optional(),
  from: z.array(nonBlank).min(1).optional(),
  in: z.array(nonBlank).min(1).optional(),
  limit: boundedLimit,
  strategy: z.enum(["MOST_RELEVANT", "MOST_RECENT", "NEWEST", "OLDEST"]).optional(),
  beforeTs: z.number().int().optional(),
  afterTs: z.number().int().optional(),
} satisfies z.ZodRawShape;

const getChannelContextSchema = {
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  cursor: nonBlank.optional(),
  limit: boundedLimit,
  strategy: z.enum(["BEFORE", "AFTER", "AROUND"]).optional(),
} satisfies z.ZodRawShape;

const getThreadContextSchema = {
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  messageId: nonBlank,
  replyLimit: boundedLimit,
} satisfies z.ZodRawShape;

type ListChannelsArgs = z.infer<z.ZodObject<typeof listChannelsSchema>>;
type SearchMessagesArgs = z.infer<z.ZodObject<typeof searchMessagesSchema>>;
type GetChannelContextArgs = z.infer<z.ZodObject<typeof getChannelContextSchema>>;
type GetThreadContextArgs = z.infer<z.ZodObject<typeof getThreadContextSchema>>;

function requestOptions(ctx: ToolExtra): RequestOptions | undefined {
  return ctx.signal === undefined ? undefined : { signal: ctx.signal };
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

function listMessagesRequest(
  args: GetChannelContextArgs,
  channelId: string,
): ListMessagesRequest {
  const request: ListMessagesRequest = { channelId, limit: args.limit };
  if (args.cursor !== undefined) request.cursor = args.cursor;
  if (args.strategy !== undefined) request.strategy = args.strategy;
  return request;
}

export function registerCuratedReadTools(
  server: McpServer,
  client: CuratedClient,
): void {
  server.tool(
    "list_channels",
    "List channels with compact ids, names, and visibility.",
    listChannelsSchema,
    async (args: ListChannelsArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const entries = await client.channels.listChannels(requestOptions(ctx));
        const channels = entries.slice(0, args.limit).map((entry) => ({
          id: entry.channel.id,
          name: entry.channel.name,
          channelType: entry.channel.channelType,
          isMember: entry.channel.isMember,
          isArchived: entry.channel.isArchived,
        }));
        return okPayload(
          `Found ${channels.length} channel${channels.length === 1 ? "" : "s"}.`,
          { channels, page: { limit: args.limit, totalReturned: channels.length } },
          { channelIds: channels.map((channel) => channel.id) },
        );
      }),
  );

  server.tool(
    "search_messages",
    "Search messages by text, actor, channel, or bounded time window.",
    searchMessagesSchema,
    async (args: SearchMessagesArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request = searchMessagesRequest(args);
        const page = await client.messages.searchMessages(request, requestOptions(ctx));
        const messages = page.result.content.map(compactMessage);
        return okPayload(
          `Found ${messages.length} message${messages.length === 1 ? "" : "s"}.`,
          {
            messages,
            page: {
              limit: request.limit,
              totalElements: page.result.totalElements,
              hasMore: page.result.hasMore,
            },
          },
          {
            messageIds: messages.map((message) => message.id),
            channelIds: [...new Set(messages.map((message) => message.target.channelId))],
          },
        );
      }),
  );

  server.tool(
    "get_channel_context",
    "Resolve a channel and list one bounded page of recent messages.",
    getChannelContextSchema,
    async (args: GetChannelContextArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const target = await resolveCuratedChannelTarget(client, "get_channel_context", args);
        if (!target.ok) return target;

        const request = listMessagesRequest(args, target.channelId);
        const page = await client.messages.listMessages(request, requestOptions(ctx));
        const messages = page.result.messages.map(compactMessage);
        const channelLabel = target.channelName === undefined
          ? target.channelId
          : `#${target.channelName}`;
        return okPayload(
          `Loaded ${messages.length} message${messages.length === 1 ? "" : "s"} from ${channelLabel}.`,
          {
            channel: { id: target.channelId, name: target.channelName },
            messages,
            page: {
              limit: request.limit,
              hasMoreBefore: page.result.hasMoreBefore,
              hasMoreAfter: page.result.hasMoreAfter,
            },
          },
          {
            channelId: target.channelId,
            messageIds: messages.map((message) => message.id),
          },
          ["Use get_thread_context with a message id to inspect a thread."],
        );
      }),
  );

  server.tool(
    "get_thread_context",
    "Resolve a channel and fetch a thread root with one bounded page of replies.",
    getThreadContextSchema,
    async (args: GetThreadContextArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const target = await resolveCuratedChannelTarget(client, "get_thread_context", args);
        if (!target.ok) return target;

        const context = await fetchThreadContext(
          client,
          {
            channelId: target.channelId,
            messageId: args.messageId,
            replyLimit: args.replyLimit,
          },
          requestOptions(ctx),
        );
        const root = compactThreadContextMessage(context.root);
        const replies = context.replies.map(compactThreadContextMessage);
        return okPayload(
          `Loaded thread ${args.messageId} with ${replies.length} repl${
            replies.length === 1 ? "y" : "ies"
          }.`,
          {
            root,
            replies,
            participants: context.participants,
            replyCount: context.replyCount,
            page: { replyLimit: args.replyLimit },
          },
          {
            channelId: target.channelId,
            rootMessageId: args.messageId,
            replyMessageIds: replies.map((reply) => reply.id),
          },
        );
      }),
  );
}
