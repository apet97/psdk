import type { SDKOptions } from "../lib/config.js";
import type { Channel } from "../models/channel.js";
import type { MessageRef } from "../models/message-ref.js";
import type {
  DmUserRequest,
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
  createFacadeFailure,
  type FacadeFailure,
} from "./facade-failure.js";
import { createFacadeWrites } from "./facade-writes.js";
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
  createResolverCache,
  type ResolverCacheInfo,
} from "./resolver-cache.js";
import {
  preflightResolvers,
  type ResolverPreflightRequest,
} from "./resolver-preflight.js";
import {
  getThreadContext,
  replyToThread,
  type ReplyToThreadOptions,
  type ReplyToThreadRequest,
  type ThreadContextOptions,
  type ThreadContextRequest,
} from "./thread-context.js";
import type {
  ChannelId,
  MessageId,
  UserId,
} from "./branded-ids.js";

type MethodArgs<T, K extends keyof T> =
  T[K] extends (...args: infer Args) => unknown ? Args : never;

export {
  assertFacadeOk,
  isFacadeFailure,
} from "./facade-failure.js";

export type {
  FacadeFailure,
  FacadeFailureReason,
} from "./facade-failure.js";

export type {
  ResolverCacheInfo,
  ResolverCacheState,
} from "./resolver-cache.js";

export type { ResolverPreflightRequest } from "./resolver-preflight.js";

export type CreatePumbleClientOptions = SDKOptions & {
  /**
   * Opt in to one in-memory `listChannels` and one in-memory `listUsers`
   * resolver result per client instance.
   *
   * Defaults to `false`. Cached resolver lists have no TTL, no background
   * refresh, and no hidden invalidation beyond clearing a failed list promise
   * so the next resolver call can retry. Use `client.resolvers.refresh()` to
   * preload or replace both lists, and `client.resolvers.clearCache()` to drop
   * cached lists manually.
   */
  resolverCache?: boolean | undefined;
};

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
    channelId?: ChannelId | undefined;
    validateTarget?: boolean | undefined;
  };

export type FacadeDmRequest =
  & Omit<DmUserRequest, "userId">
  & {
    user?: string | undefined;
    userId?: UserId | undefined;
    validateTarget?: boolean | undefined;
  };

export type FacadeThreadReplyRequest =
  & Omit<SendReplyRequest, "channelId" | "channel" | "messageId">
  & {
    channel?: string | undefined;
    channelId?: ChannelId | undefined;
    messageId: MessageId;
    validateTarget?: boolean | undefined;
  };

export interface FacadeSendReceipt {
  ok: true;
  summary: string;
  ids: { channelId: ChannelId; messageId: MessageId };
  channel?: ChannelSummary;
  message: MessageRef;
}

export interface FacadeDmReceipt {
  ok: true;
  summary: string;
  ids: { userId: UserId; messageId: MessageId; channelId: ChannelId };
  user?: UserSummary;
  message: MessageRef;
}

export interface FacadeThreadReplyReceipt {
  ok: true;
  summary: string;
  ids: { channelId: ChannelId; messageId: MessageId; rootMessageId: MessageId };
  channel?: ChannelSummary;
  message: MessageRef;
}

export interface FacadeSearchRecentRequest {
  query: string;
  limit?: number | undefined;
}

export interface FacadeSearchRecentSuccess {
  ok: true;
  summary: string;
  ids: { messageIds: string[]; channelIds: string[] };
  data: SearchHit[];
}

export type FacadeSearchRecentResult =
  | FacadeSearchRecentSuccess
  | FacadeFailure<never>;

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

export type ResolverPreflightResult =
  import("./resolver-preflight.js").ResolverPreflightResult<
    FacadeFindChannelResult,
    FacadeFindUserResult
  >;

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

export function createPumbleClient(options: CreatePumbleClientOptions = {}) {
  const { resolverCache = false, ...sdkOptions } = options;
  const raw = new PumbleSDK(sdkOptions);
  const resolverCacheState = createResolverCache(raw);

  const resolverClient = resolverCache ? resolverCacheState.client : raw;
  const resolvers = {
    /**
     * Drop both in-memory resolver lists for this client instance.
     */
    clearCache() {
      resolverCacheState.clearCache();
    },
    /**
     * Preload or replace both resolver lists for this client instance.
     *
     * This performs a foreground `listChannels` and `listUsers`; it does not
     * start any background refresh loop.
     */
    async refresh() {
      await resolverCacheState.refresh();
    },
    /**
     * Report whether resolver list promises exist for this client instance.
     *
     * `loaded` means a list promise is either in-flight or resolved; rejected
     * list promises are cleared automatically.
     */
    cacheInfo(): ResolverCacheInfo {
      return resolverCacheState.cacheInfo();
    },
    /**
     * Resolve intended write targets without performing any write operation.
     */
    async preflight(request: ResolverPreflightRequest): Promise<ResolverPreflightResult> {
      return preflightResolvers(request, resolveFacadeChannel, resolveFacadeUser);
    },
  };

  async function resolveFacadeChannel(
    input: string,
    options?: ResolveOptions,
  ): Promise<FacadeFindChannelResult> {
    const result = await resolveChannel(resolverClient, input, options);
    if (!result.ok) return createFacadeFailure("Channel", input, result);
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
    const result = await resolveUser(resolverClient, input, options);
    if (!result.ok) return createFacadeFailure("User", input, result);
    const user = userSummary(result.value);
    return {
      ok: true,
      summary: `Found user ${displayUser(user)}.`,
      ids: { userId: user.id },
      user,
    };
  }

  const facadeWrites = createFacadeWrites({
    raw,
    resolveFacadeChannel,
    resolveFacadeUser,
  });

  return {
    raw,
    resolvers,
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
      send: facadeWrites.sendFacadeMessage,
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
      dm: facadeWrites.dmFacadeUser,
      dmUser: (...args: MethodArgs<Messages, "dmUser">) =>
        raw.messages.dmUser(...args),
      dmGroup: (...args: MethodArgs<Messages, "dmGroup">) =>
        raw.messages.dmGroup(...args),
    },
    search: {
      recent: facadeWrites.searchRecent,
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
      reply: facadeWrites.replyFacadeThread,
      listReplies: (...args: MethodArgs<Messages, "fetchThreadReplies">) =>
        raw.messages.fetchThreadReplies(...args),
    },
  };
}

export type PumbleClient = ReturnType<typeof createPumbleClient>;
