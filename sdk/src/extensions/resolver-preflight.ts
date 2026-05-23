import type { ResolveOptions } from "./resolve.js";

export interface ResolverPreflightRequest {
  channel?: string | undefined;
  user?: string | undefined;
  options?: ResolveOptions | undefined;
}

export type ResolverPreflightResult<TChannelResult, TUserResult> =
  | {
    ok: true;
    channel?: Extract<TChannelResult, { ok: true }> | undefined;
    user?: Extract<TUserResult, { ok: true }> | undefined;
  }
  | {
    ok: false;
    channel?: TChannelResult | undefined;
    user?: TUserResult | undefined;
  };

export async function preflightResolvers<
  TChannelResult extends { ok: boolean },
  TUserResult extends { ok: boolean },
>(
  request: ResolverPreflightRequest,
  resolveChannel: (input: string, options?: ResolveOptions) => Promise<TChannelResult>,
  resolveUser: (input: string, options?: ResolveOptions) => Promise<TUserResult>,
): Promise<ResolverPreflightResult<TChannelResult, TUserResult>> {
  const [channel, user] = await Promise.all([
    request.channel === undefined
      ? Promise.resolve(undefined)
      : resolveChannel(request.channel, request.options),
    request.user === undefined
      ? Promise.resolve(undefined)
      : resolveUser(request.user, request.options),
  ]);
  if ((channel !== undefined && !channel.ok) || (user !== undefined && !user.ok)) {
    return { ok: false, channel, user };
  }
  return {
    ok: true,
    channel: channel as Extract<TChannelResult, { ok: true }> | undefined,
    user: user as Extract<TUserResult, { ok: true }> | undefined,
  };
}
