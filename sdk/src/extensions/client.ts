import type { SDKOptions } from "../lib/config.js";
import type { Channels } from "../sdk/channels.js";
import type { Messages } from "../sdk/messages.js";
import { PumbleSDK } from "../sdk/sdk.js";
import type { Users } from "../sdk/users.js";
import {
  findChannelByName,
  findUserByEmail,
  type FindOptions,
} from "./find.js";

type MethodArgs<T, K extends keyof T> =
  T[K] extends (...args: infer Args) => unknown ? Args : never;

export type CreatePumbleClientOptions = SDKOptions;

export function createPumbleClient(options: CreatePumbleClientOptions = {}) {
  const raw = new PumbleSDK(options);

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
    },
    users: {
      list: (...args: MethodArgs<Users, "listUsers">) =>
        raw.users.listUsers(...args),
      listGroups: (...args: MethodArgs<Users, "listUserGroups">) =>
        raw.users.listUserGroups(...args),
      findByEmail: (email: string, options?: FindOptions) =>
        findUserByEmail(raw, email, options),
      setCustomStatus: (...args: MethodArgs<Users, "customStatus">) =>
        raw.users.customStatus(...args),
    },
    messages: {
      send: (...args: MethodArgs<Messages, "sendMessage">) =>
        raw.messages.sendMessage(...args),
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
      dmUser: (...args: MethodArgs<Messages, "dmUser">) =>
        raw.messages.dmUser(...args),
      dmGroup: (...args: MethodArgs<Messages, "dmGroup">) =>
        raw.messages.dmGroup(...args),
    },
    threads: {
      reply: (...args: MethodArgs<Messages, "sendReply">) =>
        raw.messages.sendReply(...args),
      listReplies: (...args: MethodArgs<Messages, "fetchThreadReplies">) =>
        raw.messages.fetchThreadReplies(...args),
    },
  };
}

export type PumbleClient = ReturnType<typeof createPumbleClient>;
