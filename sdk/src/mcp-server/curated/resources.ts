import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { getThreadContext as fetchThreadContext } from "../../extensions/thread-context.js";
import type { RequestOptions } from "../../lib/sdks.js";
import type { Message } from "../../models/message.js";
import type { CuratedClient } from "./types.js";

const DEFAULT_RESOURCE_LIMIT = 10;
const JSON_MIME_TYPE = "application/json";

export const CURATED_RESOURCE_NAMES = [
  "pumble_channel",
  "pumble_thread",
] as const;

type ResourceExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

type MessageLike = Pick<
  Message,
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

function requestOptions(ctx: ResourceExtra): RequestOptions | undefined {
  return ctx.signal === undefined ? undefined : { signal: ctx.signal };
}

function resourceVariable(variables: Variables, name: string): string {
  const value = variables[name];
  const text = Array.isArray(value) ? value[0] : value;
  if (text === undefined || text.trim().length === 0) {
    throw new Error(`resource variable ${name} is required`);
  }
  return text;
}

function jsonResource(uri: URL, value: unknown): ReadResourceResult {
  return {
    contents: [{
      uri: uri.toString(),
      mimeType: JSON_MIME_TYPE,
      text: JSON.stringify(value),
    }],
  };
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

export function registerCuratedResources(
  server: McpServer,
  client: CuratedClient,
): void {
  server.registerResource(
    "pumble_channel",
    new ResourceTemplate("pumble://channel/{channelId}", { list: undefined }),
    {
      description: "A compact bounded page of messages from one Pumble channel.",
      mimeType: JSON_MIME_TYPE,
    },
    async (uri, variables, ctx) => {
      const channelId = resourceVariable(variables, "channelId");
      const page = await client.messages.listMessages({
        channelId,
        limit: DEFAULT_RESOURCE_LIMIT,
      }, requestOptions(ctx));

      return jsonResource(uri, {
        channelId,
        messages: page.result.messages.map(compactMessage),
        page: {
          limit: DEFAULT_RESOURCE_LIMIT,
          hasMoreBefore: page.result.hasMoreBefore,
          hasMoreAfter: page.result.hasMoreAfter,
        },
      });
    },
  );

  server.registerResource(
    "pumble_thread",
    new ResourceTemplate("pumble://thread/{channelId}/{messageId}", { list: undefined }),
    {
      description: "Compact Pumble thread root, replies, participants, and reply count.",
      mimeType: JSON_MIME_TYPE,
    },
    async (uri, variables, ctx) => {
      const channelId = resourceVariable(variables, "channelId");
      const messageId = resourceVariable(variables, "messageId");
      const context = await fetchThreadContext(
        client,
        { channelId, messageId, replyLimit: DEFAULT_RESOURCE_LIMIT },
        requestOptions(ctx),
      );

      return jsonResource(uri, {
        channelId,
        messageId,
        root: compactThreadContextMessage(context.root),
        replies: context.replies.map(compactThreadContextMessage),
        participants: context.participants,
        replyCount: context.replyCount,
        page: { replyLimit: DEFAULT_RESOURCE_LIMIT },
      });
    },
  );
}
