import type { Channel } from "../models/channel.js";
import type { ChannelListEntry } from "../models/channel-list-entry.js";
import type { User } from "../models/user.js";

const DEFAULT_MAX_CANDIDATES = 5;

export interface ResolveOptions {
  /**
   * When true (default), comparison is case-insensitive after trimming.
   */
  caseInsensitive?: boolean;
  /**
   * Maximum number of ambiguous candidates returned to callers.
   */
  maxCandidates?: number;
}

export interface ResolveUserClient {
  users: { listUsers(): Promise<User[]> };
}

export interface ResolveChannelClient {
  channels: { listChannels(): Promise<ChannelListEntry[]> };
}

export type ResolveFailureReason = "not_found" | "ambiguous";

export type ResolveResult<TValue, TCandidate> =
  | { ok: true; value: TValue }
  | { ok: false; reason: ResolveFailureReason; candidates: TCandidate[] };

export type ResolveUserCandidate = Pick<User, "id" | "email" | "name"> & {
  label: string;
};
export type ResolveChannelCandidate = Pick<Channel, "id" | "name" | "channelType"> & {
  label: string;
};

export type ResolveUserResult = ResolveResult<User, ResolveUserCandidate>;
export type ResolveChannelResult = ResolveResult<Channel, ResolveChannelCandidate>;

function normalise(value: string, caseInsensitive: boolean): string {
  const trimmed = value.trim();
  return caseInsensitive ? trimmed.toLowerCase() : trimmed;
}

function normaliseMaybe(
  value: string | undefined,
  caseInsensitive: boolean,
): string | undefined {
  return typeof value === "string" ? normalise(value, caseInsensitive) : undefined;
}

function channelInput(input: string, caseInsensitive: boolean): string {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return normalise(withoutPrefix, caseInsensitive);
}

function candidateLimit(options: ResolveOptions): number {
  if (options.maxCandidates === undefined) return DEFAULT_MAX_CANDIDATES;
  if (!Number.isFinite(options.maxCandidates)) return DEFAULT_MAX_CANDIDATES;
  return Math.max(0, Math.floor(options.maxCandidates));
}

function fromMatches<TValue, TCandidate>(
  matches: TValue[],
  options: ResolveOptions,
  toCandidate: (value: TValue) => TCandidate,
): ResolveResult<TValue, TCandidate> {
  if (matches.length === 0) {
    return { ok: false, reason: "not_found", candidates: [] };
  }
  if (matches.length === 1) {
    return { ok: true, value: matches[0] as TValue };
  }
  return {
    ok: false,
    reason: "ambiguous",
    candidates: matches.slice(0, candidateLimit(options)).map(toCandidate),
  };
}

function userCandidate(user: User): ResolveUserCandidate {
  const name = user.name.trim();
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    label: name.length > 0 ? `${name} ${user.email} | ${user.id}` : `${user.email} | ${user.id}`,
  };
}

function channelCandidate(channel: Channel): ResolveChannelCandidate {
  return {
    id: channel.id,
    name: channel.name,
    channelType: channel.channelType,
    label: `#${channel.name} | ${channel.channelType} | ${channel.id}`,
  };
}

/**
 * Resolve a user by exact id, exact email, exact name, or partial name.
 *
 * Normal not-found and ambiguity outcomes are returned as result values
 * instead of thrown errors, so callers can resolve-before-act safely.
 */
export async function resolveUser(
  client: ResolveUserClient,
  input: string,
  options: ResolveOptions = {},
): Promise<ResolveUserResult> {
  const caseInsensitive = options.caseInsensitive ?? true;
  const target = normalise(input, caseInsensitive);
  if (target.length === 0) {
    return { ok: false, reason: "not_found", candidates: [] };
  }

  const users = await client.users.listUsers();
  const exactId = users.filter(
    (user) => normaliseMaybe(user.id, caseInsensitive) === target,
  );
  if (exactId.length > 0) {
    return fromMatches(exactId, options, userCandidate);
  }

  const exactEmail = users.filter(
    (user) => normaliseMaybe(user.email, caseInsensitive) === target,
  );
  if (exactEmail.length > 0) {
    return fromMatches(exactEmail, options, userCandidate);
  }

  const exactName = users.filter(
    (user) => normaliseMaybe(user.name, caseInsensitive) === target,
  );
  if (exactName.length > 0) {
    return fromMatches(exactName, options, userCandidate);
  }

  const partialName = users.filter((user) =>
    normaliseMaybe(user.name, caseInsensitive)?.includes(target),
  );
  return fromMatches(partialName, options, userCandidate);
}

/**
 * Resolve a channel by exact id, exact name, or partial name.
 *
 * A leading `#` is accepted for human-friendly channel inputs.
 */
export async function resolveChannel(
  client: ResolveChannelClient,
  input: string,
  options: ResolveOptions = {},
): Promise<ResolveChannelResult> {
  const caseInsensitive = options.caseInsensitive ?? true;
  const target = channelInput(input, caseInsensitive);
  if (target.length === 0) {
    return { ok: false, reason: "not_found", candidates: [] };
  }

  const channels = (await client.channels.listChannels()).map((entry) => entry.channel);
  const exactId = channels.filter(
    (channel) => normaliseMaybe(channel.id, caseInsensitive) === target,
  );
  if (exactId.length > 0) {
    return fromMatches(exactId, options, channelCandidate);
  }

  const exactName = channels.filter(
    (channel) => normaliseMaybe(channel.name, caseInsensitive) === target,
  );
  if (exactName.length > 0) {
    return fromMatches(exactName, options, channelCandidate);
  }

  const partialName = channels.filter((channel) =>
    normaliseMaybe(channel.name, caseInsensitive)?.includes(target),
  );
  return fromMatches(partialName, options, channelCandidate);
}
