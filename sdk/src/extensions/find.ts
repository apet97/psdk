// Convenience lookups that fan out across the un-paginated user/channel
// listings — both are bounded (a Pumble workspace has dozens-to-hundreds
// of channels, not millions), so a single SDK call is cheap.

import type { User } from "../models/user.js";
import type { Channel } from "../models/channel.js";
import type { ChannelListEntry } from "../models/channel-list-entry.js";

export interface FindClient {
  users: { listUsers(): Promise<User[]> };
  channels: { listChannels(): Promise<ChannelListEntry[]> };
}

export interface FindOptions {
  /**
   * When true (default), comparison is case-insensitive after trimming.
   */
  caseInsensitive?: boolean;
}

function normalise(s: string, ci: boolean): string {
  return ci ? s.trim().toLowerCase() : s.trim();
}

/**
 * Find a workspace user by email. Returns undefined if no match.
 *
 * Pumble has no server-side user search by email — this helper walks
 * `listUsers()` and matches client-side. Cache the result if you need
 * to look up the same email more than once per session.
 */
export async function findUserByEmail(
  client: FindClient,
  email: string,
  options: FindOptions = {},
): Promise<User | undefined> {
  const ci = options.caseInsensitive ?? true;
  const target = normalise(email, ci);
  const users = await client.users.listUsers();
  return users.find(
    (u) => typeof u.email === "string" && normalise(u.email, ci) === target,
  );
}

/**
 * Find a channel by name. Returns undefined if no match.
 *
 * Pumble channel names ARE globally unique within a workspace, so the
 * result is unambiguous when found.
 */
export async function findChannelByName(
  client: FindClient,
  name: string,
  options: FindOptions = {},
): Promise<Channel | undefined> {
  const ci = options.caseInsensitive ?? true;
  const target = normalise(name, ci);
  const channels = await client.channels.listChannels();
  return channels
    .map((entry) => entry.channel)
    .find(
      (c): c is Channel =>
        !!c && typeof c.name === "string" && normalise(c.name, ci) === target,
    );
}
