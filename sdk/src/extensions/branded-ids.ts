// Branded ID types for Pumble entity references.
//
// The SDK's generated types all use plain `string` for IDs because the
// OpenAPI spec only knows about JSON types, not nominal subtypes of
// string. That's normally fine — until a caller passes a channelId in
// a slot that wants a messageId. The compiler can't help; the API
// returns a runtime 403 ("Could not find message with that
// identifier") instead.
//
// This module adds opt-in branded types. Cost: caller has to tag IDs
// at the boundary (`asChannelId(c.id)`). Payoff: TypeScript rejects
// `sdk.messages.fetchMessage({ messageId: channelId, ... })` at compile
// time IF the caller routes IDs through the branded helpers.
//
// Adoption is incremental — these types are assignable TO plain
// `string` (the SDK signatures), but plain `string` is NOT assignable
// FROM `ChannelId` etc., so the protection is one-way: once an ID is
// branded, the compiler tracks it.

declare const __idBrand: unique symbol;

/** Branded string for a Pumble channel id. */
export type ChannelId = string & { readonly [__idBrand]: "ChannelId" };
/** Branded string for a Pumble message id. */
export type MessageId = string & { readonly [__idBrand]: "MessageId" };
/** Branded string for a Pumble scheduled-message id. */
export type ScheduledMessageId = string & {
  readonly [__idBrand]: "ScheduledMessageId";
};
/** Branded string for a Pumble user id. */
export type UserId = string & { readonly [__idBrand]: "UserId" };
/** Branded string for a Pumble user-group id. */
export type UserGroupId = string & { readonly [__idBrand]: "UserGroupId" };
/** Branded string for a Pumble workspace id. */
export type WorkspaceId = string & { readonly [__idBrand]: "WorkspaceId" };

/** Union of every Pumble entity-id brand. */
export type PumbleId =
  | ChannelId
  | MessageId
  | ScheduledMessageId
  | UserId
  | UserGroupId
  | WorkspaceId;

const HEX24 = /^[a-f0-9]{24}$/i;

/**
 * Runtime guard for Pumble's 24-char-hex id shape. Throws if the input
 * isn't a 24-character hex string. Used by the `asXId(...)` helpers
 * below; callers that prefer not-throwing can use {@link isPumbleIdLike}.
 */
function assertHex24(value: string, what: string): void {
  if (typeof value !== "string" || !HEX24.test(value)) {
    throw new TypeError(
      `${what}: expected a 24-character hex string, got: ${JSON.stringify(value)}`,
    );
  }
}

/** Non-throwing shape check. Does NOT verify the id exists in Pumble. */
export function isPumbleIdLike(value: unknown): value is string {
  return typeof value === "string" && HEX24.test(value);
}

/** Tag a raw string as a {@link ChannelId}. Throws on shape mismatch. */
export function asChannelId(value: string): ChannelId {
  assertHex24(value, "asChannelId");
  return value as ChannelId;
}

/** Tag a raw string as a {@link MessageId}. Throws on shape mismatch. */
export function asMessageId(value: string): MessageId {
  assertHex24(value, "asMessageId");
  return value as MessageId;
}

/** Tag a raw string as a {@link ScheduledMessageId}. Throws on shape mismatch. */
export function asScheduledMessageId(value: string): ScheduledMessageId {
  assertHex24(value, "asScheduledMessageId");
  return value as ScheduledMessageId;
}

/** Tag a raw string as a {@link UserId}. Throws on shape mismatch. */
export function asUserId(value: string): UserId {
  assertHex24(value, "asUserId");
  return value as UserId;
}

/** Tag a raw string as a {@link UserGroupId}. Throws on shape mismatch. */
export function asUserGroupId(value: string): UserGroupId {
  assertHex24(value, "asUserGroupId");
  return value as UserGroupId;
}

/** Tag a raw string as a {@link WorkspaceId}. Throws on shape mismatch. */
export function asWorkspaceId(value: string): WorkspaceId {
  assertHex24(value, "asWorkspaceId");
  return value as WorkspaceId;
}

/**
 * Escape hatch — strip the brand and return a plain string. Identity at
 * runtime; only useful when interfacing with code that explicitly wants
 * `string` and TypeScript needs the hint.
 */
export function unbrand(id: PumbleId): string {
  return id;
}
