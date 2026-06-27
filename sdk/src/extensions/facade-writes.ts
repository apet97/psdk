import type { RequestOptions } from "../lib/sdks.js";
import type {
  DmUserRequest,
  SearchMessagesRequest,
  SendMessageRequest,
  SendReplyRequest,
} from "../models/operations/index.js";
import type { SearchHit } from "../models/search-hit.js";
import type {
  ChannelSummary,
  FacadeFailure,
  FacadeFindChannelResult,
  FacadeFindUserResult,
  FacadeSearchRecentRequest,
  FacadeSearchRecentResult,
  FacadeSendMessageRequest,
  FacadeSendReceipt,
  FacadeDmRequest,
  FacadeDmReceipt,
  FacadeThreadReplyRequest,
  FacadeThreadReplyReceipt,
  UserSummary,
} from "./client.js";
import {
  createFacadeInvalidRequest,
  createFacadeOperationFailure,
} from "./facade-failure.js";
import {
  isFacadeOperationFailure,
  operationFailureNextAction,
  operationFailureReason,
} from "./facade-operation.js";
import {
  asChannelId,
  asMessageId,
  asUserId,
} from "./branded-ids.js";

interface FacadeWriteRawClient {
  messages: {
    sendMessage(request: SendMessageRequest, options?: RequestOptions): Promise<FacadeSendReceipt["message"]>;
    dmUser(request: DmUserRequest, options?: RequestOptions): Promise<FacadeDmReceipt["message"]>;
    sendReply(request: SendReplyRequest, options?: RequestOptions): Promise<FacadeThreadReplyReceipt["message"]>;
    searchMessages(
      request: SearchMessagesRequest,
      options?: RequestOptions,
    ): Promise<{ result: { content: SearchHit[] } }>;
  };
}

export interface CreateFacadeWritesOptions {
  raw: FacadeWriteRawClient;
  resolveFacadeChannel(
    input: string,
  ): Promise<FacadeFindChannelResult>;
  resolveFacadeUser(
    input: string,
  ): Promise<FacadeFindUserResult>;
}

function displayChannel(channel: ChannelSummary): string {
  return channel.name.startsWith("#") ? channel.name : `#${channel.name}`;
}

function displayUser(user: UserSummary): string {
  return user.name.trim().length > 0 ? user.name : user.email;
}

export function createFacadeWrites({
  raw,
  resolveFacadeChannel,
  resolveFacadeUser,
}: CreateFacadeWritesOptions) {
  async function sendFacadeMessage(
    request: FacadeSendMessageRequest,
    options?: RequestOptions,
  ): Promise<FacadeSendReceipt | FacadeFailure<ChannelSummary>> {
    const { channel, channelId, validateTarget, ...rest } = request;
    const input = channelId ?? channel;
    if (input === undefined || input.trim().length === 0) {
      return createFacadeInvalidRequest(
        "messages.send requires channel or channelId.",
        "Pass channel, channelId, or preflight the target before writing.",
      );
    }
    if (channelId !== undefined && validateTarget !== true) {
      const message = await raw.messages.sendMessage({
        ...rest,
        channelId,
      }, options).catch((error: unknown) =>
        createFacadeOperationFailure(
          operationFailureReason(error),
          "Pumble API rejected messages.send.",
          operationFailureNextAction,
          error,
        )
      );
      if (isFacadeOperationFailure(message)) return message;
      return {
        ok: true,
        summary: `Sent message ${message.id} to channel ${channelId}.`,
        ids: { channelId: asChannelId(channelId), messageId: asMessageId(message.id) },
        message,
      };
    }
    const resolved = await resolveFacadeChannel(input);
    if (!resolved.ok) return resolved;

    const message = await raw.messages.sendMessage({
      ...rest,
      channelId: resolved.channel.id,
    }, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected messages.send.",
        operationFailureNextAction,
        error,
      )
    );
    if (isFacadeOperationFailure(message)) return message;
    return {
      ok: true,
      summary: `Sent message ${message.id} to ${displayChannel(resolved.channel)}.`,
      ids: {
        channelId: asChannelId(resolved.channel.id),
        messageId: asMessageId(message.id),
      },
      channel: resolved.channel,
      message,
    };
  }

  async function dmFacadeUser(
    request: FacadeDmRequest,
    options?: RequestOptions,
  ): Promise<FacadeDmReceipt | FacadeFailure<UserSummary>> {
    const { user, userId, validateTarget, ...rest } = request;
    const input = userId ?? user;
    if (input === undefined || input.trim().length === 0) {
      return createFacadeInvalidRequest(
        "messages.dm requires user or userId.",
        "Pass user, userId, or preflight the target before writing.",
      );
    }
    if (userId !== undefined && validateTarget !== true) {
      const message = await raw.messages.dmUser({
        ...rest,
        userId,
      }, options).catch((error: unknown) =>
        createFacadeOperationFailure(
          operationFailureReason(error),
          "Pumble API rejected messages.dm.",
          operationFailureNextAction,
          error,
        )
      );
      if (isFacadeOperationFailure(message)) return message;
      return {
        ok: true,
        summary: `Sent DM ${message.id} to user ${userId}.`,
        ids: {
          userId: asUserId(userId),
          messageId: asMessageId(message.id),
          channelId: asChannelId(message.channelId),
        },
        message,
      };
    }
    const resolved = await resolveFacadeUser(input);
    if (!resolved.ok) return resolved;

    const message = await raw.messages.dmUser({
      ...rest,
      userId: resolved.user.id,
    }, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected messages.dm.",
        operationFailureNextAction,
        error,
      )
    );
    if (isFacadeOperationFailure(message)) return message;
    return {
      ok: true,
      summary: `Sent DM ${message.id} to ${displayUser(resolved.user)}.`,
      ids: {
        userId: asUserId(resolved.user.id),
        messageId: asMessageId(message.id),
        channelId: asChannelId(message.channelId),
      },
      user: resolved.user,
      message,
    };
  }

  async function replyFacadeThread(
    request: FacadeThreadReplyRequest,
    options?: RequestOptions,
  ): Promise<FacadeThreadReplyReceipt | FacadeFailure<ChannelSummary>> {
    const { channel, channelId, validateTarget, ...rest } = request;
    const input = channelId ?? channel;
    if (input === undefined || input.trim().length === 0) {
      return createFacadeInvalidRequest(
        "threads.reply requires channel or channelId.",
        "Pass channel, channelId, or preflight the target before writing.",
      );
    }
    if (channelId !== undefined && validateTarget !== true) {
      const message = await raw.messages.sendReply({
        ...rest,
        channelId,
      }, options).catch((error: unknown) =>
        createFacadeOperationFailure(
          operationFailureReason(error),
          "Pumble API rejected threads.reply.",
          operationFailureNextAction,
          error,
        )
      );
      if (isFacadeOperationFailure(message)) return message;
      return {
        ok: true,
        summary: `Replied with ${message.id} in channel ${channelId}.`,
        ids: {
          channelId: asChannelId(channelId),
          messageId: asMessageId(message.id),
          rootMessageId: asMessageId(request.messageId),
        },
        message,
      };
    }
    const resolved = await resolveFacadeChannel(input);
    if (!resolved.ok) return resolved;

    const message = await raw.messages.sendReply({
      ...rest,
      channelId: resolved.channel.id,
    }, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected threads.reply.",
        operationFailureNextAction,
        error,
      )
    );
    if (isFacadeOperationFailure(message)) return message;
    return {
      ok: true,
      summary: `Replied with ${message.id} in ${displayChannel(resolved.channel)}.`,
      ids: {
        channelId: asChannelId(resolved.channel.id),
        messageId: asMessageId(message.id),
        rootMessageId: asMessageId(request.messageId),
      },
      channel: resolved.channel,
      message,
    };
  }

  async function searchRecent(
    request: FacadeSearchRecentRequest,
    options?: RequestOptions,
  ): Promise<FacadeSearchRecentResult> {
    const limit = request.limit ?? 10;
    const searchRequest: SearchMessagesRequest = {
      text: request.query,
      limit,
      strategy: "MOST_RECENT",
    };
    const page = await raw.messages.searchMessages(searchRequest, options)
      .catch((error: unknown) =>
        createFacadeOperationFailure(
          operationFailureReason(error),
          "Pumble API rejected search.recent.",
          operationFailureNextAction,
          error,
        )
      );
    if (isFacadeOperationFailure(page)) return page;
    const data = page.result.content.slice(0, limit);
    return {
      ok: true,
      summary: `Found ${data.length} recent message${data.length === 1 ? "" : "s"} for ${JSON.stringify(request.query)}.`,
      ids: {
        messageIds: data.map((message) => message.id),
        channelIds: [...new Set(data.map((message) => message.channelId))],
      },
      data,
    };
  }

  return {
    sendFacadeMessage,
    dmFacadeUser,
    replyFacadeThread,
    searchRecent,
  };
}
