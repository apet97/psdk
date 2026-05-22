export type PumbleWebhookEventType =
  | "NEW_MESSAGE"
  | "UPDATED_MESSAGE"
  | "REACTION_ADDED"
  | "CHANNEL_CREATED"
  | "APP_UNINSTALLED"
  | "APP_UNAUTHORIZED"
  | "WORKSPACE_USER_JOINED";

export interface PumbleNotificationBase {
  /** Workspace id. */
  wId?: string;
  /** Event type discriminator from Pumble notification bodies. */
  ty?: PumbleWebhookEventType | string;
  /** Request id. */
  rid?: string;
  [key: string]: unknown;
}

export interface NotificationMessage extends PumbleNotificationBase {
  mId?: string;
  cId?: string;
  trId?: string;
  stc?: string;
  trMt?: string;
  aId?: string;
  tx?: string;
  bl?: Array<Record<string, unknown>>;
  ts?: string;
  tsm?: number;
  st?: string;
  f?: Array<Record<string, unknown>>;
  lId?: string;
  att?: Record<string, unknown>;
  sm?: Record<string, unknown>;
  mm?: Record<string, unknown>;
  md?: string[];
  mc?: string[];
  mu?: string[];
  au?: Array<Record<string, unknown>>;
  e?: boolean;
  eph?: boolean;
}

export interface NotificationReaction extends PumbleNotificationBase {
  cId?: string;
  mId?: string;
  mat?: string;
  uId?: string;
  rc?: string;
}

export interface NotificationChannel extends PumbleNotificationBase {
  cId?: string;
  cN?: string;
  cU?: string[];
  cT?: string;
}

export interface NotificationWorkspaceUserJoined extends PumbleNotificationBase {
  uN?: string;
  uE?: string;
  uId?: string;
  afp?: string;
  asp?: string;
  tz?: string;
  sts?: string;
  pt?: string;
  pp?: string;
  cs?: Record<string, unknown>;
  st?: string;
  ro?: string;
  au?: string;
  ib?: string;
}

export interface NotificationAppUninstalled {
  id?: string;
  app?: string;
  workspace?: string;
  installedBy?: string;
  botUser?: string;
  uninstalledAt?: string | Date;
  [key: string]: unknown;
}

export interface NotificationAppUnauthorized {
  id?: string;
  app?: string;
  appInstallation?: string;
  workspaceUser?: string;
  workspace?: string;
  grantedScopes?: string[];
  accessGranted?: boolean;
  [key: string]: unknown;
}

export type PumbleWebhookBodyByType = {
  NEW_MESSAGE: NotificationMessage;
  UPDATED_MESSAGE: NotificationMessage;
  REACTION_ADDED: NotificationReaction;
  CHANNEL_CREATED: NotificationChannel;
  APP_UNINSTALLED: NotificationAppUninstalled;
  APP_UNAUTHORIZED: NotificationAppUnauthorized;
  WORKSPACE_USER_JOINED: NotificationWorkspaceUserJoined;
};

export interface PumbleWebhookEvent<T extends PumbleWebhookEventType = PumbleWebhookEventType> {
  type: T;
  body: PumbleWebhookBodyByType[T];
  workspaceId?: string;
  workspaceUserIds?: string[];
  raw: unknown;
}

export type NewMessageEvent = PumbleWebhookEvent<"NEW_MESSAGE">;
export type UpdatedMessageEvent = PumbleWebhookEvent<"UPDATED_MESSAGE">;
export type ReactionEvent = PumbleWebhookEvent<"REACTION_ADDED">;
export type ChannelCreatedEvent = PumbleWebhookEvent<"CHANNEL_CREATED">;
export type AppUninstalledEvent = PumbleWebhookEvent<"APP_UNINSTALLED">;
export type AppUnauthorizedEvent = PumbleWebhookEvent<"APP_UNAUTHORIZED">;
export type WorkspaceUserJoinedEvent = PumbleWebhookEvent<"WORKSPACE_USER_JOINED">;
