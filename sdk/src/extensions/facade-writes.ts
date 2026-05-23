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

function missingTarget(helper: string, target: string): never {
  throw new Error(`${helper}: ${target} is required`);
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
    const { channel, channelId, ...rest } = request;
    const input = channelId ?? channel ?? missingTarget("messages.send", "channel");
    const resolved = await resolveFacadeChannel(input);
    if (!resolved.ok) return resolved;

    const message = await raw.messages.sendMessage({
      ...rest,
      channelId: resolved.channel.id,
    }, options);
    return {
      ok: true,
      summary: `Sent message ${message.id} to ${displayChannel(resolved.channel)}.`,
      ids: { channelId: resolved.channel.id, messageId: message.id },
      channel: resolved.channel,
      message,
    };
  }

  async function dmFacadeUser(
    request: FacadeDmRequest,
    options?: RequestOptions,
  ): Promise<FacadeDmReceipt | FacadeFailure<UserSummary>> {
    const { user, ...rest } = request;
    const resolved = await resolveFacadeUser(user);
    if (!resolved.ok) return resolved;

    const message = await raw.messages.dmUser({
      ...rest,
      userId: resolved.user.id,
    }, options);
    return {
      ok: true,
      summary: `Sent DM ${message.id} to ${displayUser(resolved.user)}.`,
      ids: {
        userId: resolved.user.id,
        messageId: message.id,
        channelId: message.channelId,
      },
      user: resolved.user,
      message,
    };
  }

  async function replyFacadeThread(
    request: FacadeThreadReplyRequest,
    options?: RequestOptions,
  ): Promise<FacadeThreadReplyReceipt | FacadeFailure<ChannelSummary>> {
    const { channel, channelId, ...rest } = request;
    const input = channelId ?? channel ?? missingTarget("threads.reply", "channel");
    const resolved = await resolveFacadeChannel(input);
    if (!resolved.ok) return resolved;

    const message = await raw.messages.sendReply({
      ...rest,
      channelId: resolved.channel.id,
    }, options);
    return {
      ok: true,
      summary: `Replied with ${message.id} in ${displayChannel(resolved.channel)}.`,
      ids: {
        channelId: resolved.channel.id,
        messageId: message.id,
        rootMessageId: request.messageId,
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
    const page = await raw.messages.searchMessages(searchRequest, options);
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
