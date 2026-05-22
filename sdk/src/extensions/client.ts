import type { SDKOptions } from "../lib/config.js";
import type { RequestOptions } from "../lib/sdks.js";
import type { Channel } from "../models/channel.js";
import type { MessageRef } from "../models/message-ref.js";
import type {
  DmUserRequest,
  SearchMessagesRequest,
  SendMessageRequest,
  SendReplyRequest,
} from "../models/operations/index.js";
import type { SearchHit } from "../models/search-hit.js";
import type { User } from "../models/user.js";
import type { Channels } from "../sdk/channels.js";
import type { Messages } from "../sdk/messages.js";
import { PumbleSDK } from "../sdk/sdk.js";
import type { Users } from "../sdk/users.js";
import {
  findChannelByName,
  findUserByEmail,
  type FindOptions,
} from "./find.js";
import {
  resolveChannel,
  resolveUser,
  type ResolveOptions,
} from "./resolve.js";
import {
  getThreadContext,
  replyToThread,
  type ReplyToThreadOptions,
  type ReplyToThreadRequest,
  type ThreadContextOptions,
  type ThreadContextRequest,
} from "./thread-context.js";

type MethodArgs<T, K extends keyof T> =
  T[K] extends (...args: infer Args) => unknown ? Args : never;

export type CreatePumbleClientOptions = SDKOptions;

export type FacadeFailureReason = "not_found" | "ambiguous";

export interface FacadeFailure<TChoice> {
  ok: false;
  reason: FacadeFailureReason;
  summary: string;
  choices: TChoice[];
}

export interface ChannelSummary {
  id: string;
  name: string;
  channelType: Channel["channelType"];
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
}

export type FacadeSendMessageRequest =
  & Omit<SendMessageRequest, "channelId" | "channel">
  & {
    channel?: string | undefined;
    channelId?: string | undefined;
  };

export type FacadeDmRequest =
  & Omit<DmUserRequest, "userId">
  & {
    user: string;
  };

export type FacadeThreadReplyRequest =
  & Omit<SendReplyRequest, "channelId" | "channel">
  & {
    channel?: string | undefined;
    channelId?: string | undefined;
  };

export interface FacadeSendReceipt {
  ok: true;
  summary: string;
  ids: { channelId: string; messageId: string };
  channel: ChannelSummary;
  message: MessageRef;
}

export interface FacadeDmReceipt {
  ok: true;
  summary: string;
  ids: { userId: string; messageId: string; channelId: string };
  user: UserSummary;
  message: MessageRef;
}

export interface FacadeThreadReplyReceipt {
  ok: true;
  summary: string;
  ids: { channelId: string; messageId: string; rootMessageId: string };
  channel: ChannelSummary;
  message: MessageRef;
}

export interface FacadeSearchRecentRequest {
  query: string;
  limit?: number | undefined;
}

export interface FacadeSearchRecentResult {
  ok: true;
  summary: string;
  ids: { messageIds: string[]; channelIds: string[] };
  data: SearchHit[];
}

export type FacadeFindChannelResult =
  | {
    ok: true;
    summary: string;
    ids: { channelId: string };
    channel: ChannelSummary;
  }
  | FacadeFailure<ChannelSummary>;

export type FacadeFindUserResult =
  | {
    ok: true;
    summary: string;
    ids: { userId: string };
    user: UserSummary;
  }
  | FacadeFailure<UserSummary>;

function channelSummary(channel: Channel): ChannelSummary {
  return {
    id: channel.id,
    name: channel.name,
    channelType: channel.channelType,
  };
}

function userSummary(user: User): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
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

function targetFailure<TChoice>(
  targetKind: "Channel" | "User",
  input: string,
  result: { ok: false; reason: FacadeFailureReason; candidates: TChoice[] },
): FacadeFailure<TChoice> {
  return {
    ok: false,
    reason: result.reason,
    summary: `${targetKind} ${JSON.stringify(input)} is ${
      result.reason === "ambiguous" ? "ambiguous" : "not found"
    }.`,
    choices: result.candidates,
  };
}

export function createPumbleClient(options: CreatePumbleClientOptions = {}) {
  const raw = new PumbleSDK(options);

  async function resolveFacadeChannel(
    input: string,
    options?: ResolveOptions,
  ): Promise<FacadeFindChannelResult> {
    const result = await resolveChannel(raw, input, options);
    if (!result.ok) return targetFailure("Channel", input, result);
    const channel = channelSummary(result.value);
    return {
      ok: true,
      summary: `Found channel ${displayChannel(channel)}.`,
      ids: { channelId: channel.id },
      channel,
    };
  }

  async function resolveFacadeUser(
    input: string,
    options?: ResolveOptions,
  ): Promise<FacadeFindUserResult> {
    const result = await resolveUser(raw, input, options);
    if (!result.ok) return targetFailure("User", input, result);
    const user = userSummary(result.value);
    return {
      ok: true,
      summary: `Found user ${displayUser(user)}.`,
      ids: { userId: user.id },
      user,
    };
  }

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
    raw,
    identity: {
      me: (...args: MethodArgs<Users, "myInfo">) => raw.users.myInfo(...args),
    },
    channels: {
      list: (...args: MethodArgs<Channels, "listChannels">) =>
        raw.channels.listChannels(...args),
      get: (...args: MethodArgs<Channels, "getChannel">) =>
        raw.channels.getChannel(...args),
      create: (...args: MethodArgs<Channels, "createChannel">) =>
        raw.channels.createChannel(...args),
      addUsers: (...args: MethodArgs<Channels, "addUsersToChannel">) =>
        raw.channels.addUsersToChannel(...args),
      removeUser: (...args: MethodArgs<Channels, "removeUserFromChannel">) =>
        raw.channels.removeUserFromChannel(...args),
      findByName: (name: string, options?: FindOptions) =>
        findChannelByName(raw, name, options),
      resolve: (input: string, options?: ResolveOptions) =>
        resolveChannel(raw, input, options),
      find: (input: string, options?: ResolveOptions) =>
        resolveFacadeChannel(input, options),
    },
    users: {
      list: (...args: MethodArgs<Users, "listUsers">) =>
        raw.users.listUsers(...args),
      listGroups: (...args: MethodArgs<Users, "listUserGroups">) =>
        raw.users.listUserGroups(...args),
      findByEmail: (email: string, options?: FindOptions) =>
        findUserByEmail(raw, email, options),
      resolve: (input: string, options?: ResolveOptions) =>
        resolveUser(raw, input, options),
      find: (input: string, options?: ResolveOptions) =>
        resolveFacadeUser(input, options),
      setCustomStatus: (...args: MethodArgs<Users, "customStatus">) =>
        raw.users.customStatus(...args),
    },
    messages: {
      send: sendFacadeMessage,
      list: (...args: MethodArgs<Messages, "listMessages">) =>
        raw.messages.listMessages(...args),
      search: (...args: MethodArgs<Messages, "searchMessages">) =>
        raw.messages.searchMessages(...args),
      fetch: (...args: MethodArgs<Messages, "fetchMessage">) =>
        raw.messages.fetchMessage(...args),
      edit: (...args: MethodArgs<Messages, "editMessage">) =>
        raw.messages.editMessage(...args),
      delete: (...args: MethodArgs<Messages, "deleteMessage">) =>
        raw.messages.deleteMessage(...args),
      addReaction: (...args: MethodArgs<Messages, "addReaction">) =>
        raw.messages.addReaction(...args),
      removeReaction: (...args: MethodArgs<Messages, "removeReaction">) =>
        raw.messages.removeReaction(...args),
      dm: dmFacadeUser,
      dmUser: (...args: MethodArgs<Messages, "dmUser">) =>
        raw.messages.dmUser(...args),
      dmGroup: (...args: MethodArgs<Messages, "dmGroup">) =>
        raw.messages.dmGroup(...args),
    },
    search: {
      recent: searchRecent,
    },
    threads: {
      getContext: (
        request: ThreadContextRequest,
        options?: ThreadContextOptions,
      ) => getThreadContext(raw, request, options),
      replyToThread: (
        request: ReplyToThreadRequest,
        options?: ReplyToThreadOptions,
      ) => replyToThread(raw, request, options),
      reply: replyFacadeThread,
      listReplies: (...args: MethodArgs<Messages, "fetchThreadReplies">) =>
        raw.messages.fetchThreadReplies(...args),
    },
  };
}

export type PumbleClient = ReturnType<typeof createPumbleClient>;
