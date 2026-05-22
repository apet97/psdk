// Hand-written barrel for user-facing SDK extensions. Speakeasy regen
// does NOT touch this directory, so anything exported here survives a
// `speakeasy generate sdk` run.
export {
  createPumbleClient,
  type CreatePumbleClientOptions,
  type PumbleClient,
} from "./client.js";

export {
  searchAllMessages,
  type SearchAllClient,
  type SearchAllPageResult,
  type SearchAllOptions,
} from "./search-all.js";

export {
  listAllMessages,
  type ListAllClient,
  type ListAllPageResult,
  type ListAllOptions,
} from "./list-all-messages.js";

export {
  findUserByEmail,
  findChannelByName,
  type FindClient,
  type FindOptions,
} from "./find.js";

export {
  withRetries,
  type RetryOptions,
} from "./with-retries.js";

export {
  categorizeError,
  type CategorizedError,
  type ErrorCategory,
} from "./categorize-error.js";

export {
  createRateLimiter,
  type RateLimiter,
  type RateLimiterOptions,
} from "./rate-limiter.js";

export {
  asChannelId,
  asMessageId,
  asScheduledMessageId,
  asUserId,
  asUserGroupId,
  asWorkspaceId,
  isPumbleIdLike,
  unbrand,
  type ChannelId,
  type MessageId,
  type ScheduledMessageId,
  type UserId,
  type UserGroupId,
  type WorkspaceId,
  type PumbleId,
} from "./branded-ids.js";

export {
  createOTelSpanRecorder,
  createNoopRecorder,
  createJsonlAuditWriter,
  wrapClient,
  type SpanRecorder,
  type RecorderSpan,
  type SpanStatus,
  type OTelRecorderOptions,
  type JsonlEvent,
  type JsonlAuditWriter,
  type WrapClientOptions,
} from "./telemetry.js";

export {
  createWebhookHandler,
  PUMBLE_REQUEST_SIGNATURE_HEADER,
  PUMBLE_REQUEST_TIMESTAMP_HEADER,
  type CreateWebhookHandlerOptions,
  type WebhookHandlers,
} from "./webhooks.js";

export type {
  AppUnauthorizedEvent,
  AppUninstalledEvent,
  ChannelCreatedEvent,
  NewMessageEvent,
  NotificationAppUnauthorized,
  NotificationAppUninstalled,
  NotificationChannel,
  NotificationMessage,
  NotificationReaction,
  NotificationWorkspaceUserJoined,
  PumbleWebhookEvent,
  PumbleWebhookEventType,
  ReactionEvent,
  UpdatedMessageEvent,
  WorkspaceUserJoinedEvent,
} from "./webhook-events.js";
