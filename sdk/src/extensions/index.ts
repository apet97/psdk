// Hand-written barrel for user-facing SDK extensions. Speakeasy regen
// does NOT touch this directory, so anything exported here survives a
// `speakeasy generate sdk` run.
export {
  assertFacadeOk,
  createPumbleClient,
  isFacadeFailure,
  type CreatePumbleClientOptions,
  type ChannelSummary,
  type FacadeDmReceipt,
  type FacadeDmRequest,
  type FacadeFailure,
  type FacadeFailureReason,
  type FacadeFindChannelResult,
  type FacadeFindUserResult,
  type FacadeSearchRecentRequest,
  type FacadeSearchRecentResult,
  type FacadeSendMessageRequest,
  type FacadeSendReceipt,
  type FacadeThreadReplyReceipt,
  type FacadeThreadReplyRequest,
  type PumbleClient,
  type ResolverCacheInfo,
  type ResolverCacheState,
  type ResolverPreflightRequest,
  type ResolverPreflightResult,
  type UserSummary,
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
  getThreadContext,
  replyToThread,
  type ReplyToThreadClient,
  type ReplyToThreadOptions,
  type ReplyToThreadRequest,
  type ThreadContext,
  type ThreadContextClient,
  type ThreadContextMessage,
  type ThreadContextOptions,
  type ThreadContextRequest,
} from "./thread-context.js";

export {
  createConfirmationToken,
  createWritePreview,
  verifyConfirmationToken,
  type ConfirmationSecret,
  type WriteAction,
  type WriteActionTarget,
  type WritePreview,
  type WriteRiskLevel,
} from "./write-plan.js";

export {
  findUserByEmail,
  findChannelByName,
  type FindClient,
  type FindOptions,
} from "./find.js";

export {
  formatChannelCandidateLabel,
  formatUserCandidateLabel,
  resolveChannel,
  resolveUser,
  type ResolveChannelCandidate,
  type ResolveChannelClient,
  type ResolveChannelResult,
  type ResolveFailureReason,
  type ResolveOptions,
  type ResolveResult,
  type ResolveUserCandidate,
  type ResolveUserClient,
  type ResolveUserResult,
} from "./resolve.js";

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
  createFixtureBodyHash,
  createMockPumbleFetch,
  sanitizePumbleFixtureValue,
  type CreateMockPumbleFetchOptions,
  type MockPumbleFetchFixture,
  type MockPumbleFetchKey,
  type MockPumbleFetchRequest,
  type MockPumbleFetchResponse,
  type MockPumbleFetch,
} from "./testing/index.js";

export {
  createPumbleEventRouter,
  PumbleApp,
  type PumbleAppEventContext,
  type PumbleAppOptions,
  type PumbleEventDispatchResult,
  type PumbleEventHandler,
  type PumbleEventRouter,
  type PumbleEventRouterContext,
  type PumbleNodeWebhookHandler,
  type PumbleWebhookHttpResult,
  type PumbleWebhookRawBody,
} from "./app/index.js";

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
