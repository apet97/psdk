export const PUMBLE_OAUTH_CONSENT_URL = "https://app.pumble.com/access-request";
export const PUMBLE_OAUTH_ACCESS_TOKEN_URL = "https://api-ga.pumble.com/oauth2/access";

export interface CreatePumbleOAuthAuthorizationUrlOptions {
  clientId: string;
  redirectUrl: string;
  userScopes?: readonly string[];
  botScopes?: readonly string[];
  defaultWorkspaceId?: string;
  state?: string;
  isReinstall?: boolean;
  consentUrl?: string | URL;
}

export interface CreatePumbleOAuthAccessTokenRequestOptions {
  clientId: string;
  clientSecret: string;
  code: string;
  tokenUrl?: string | URL;
}

export interface PumbleOAuthAccessTokenRequest {
  url: string;
  init: RequestInit & {
    method: "POST";
    body: FormData;
  };
}

export interface VerifyPumbleOAuthCallbackOptions {
  expectedState?: string;
}

export interface PumbleOAuthCallback {
  code: string;
  state?: string;
}

export function createPumbleOAuthAuthorizationUrl(
  options: CreatePumbleOAuthAuthorizationUrlOptions,
): string {
  const userScopes = options.userScopes ?? [];
  const botScopes = options.botScopes ?? [];
  if (userScopes.length + botScopes.length === 0) {
    throw new Error("Pumble OAuth authorization URL requires at least one user or bot scope");
  }

  const url = new URL(options.consentUrl ?? PUMBLE_OAUTH_CONSENT_URL);
  url.searchParams.set("redirectUrl", required("redirectUrl", options.redirectUrl));
  url.searchParams.set("clientId", required("clientId", options.clientId));
  url.searchParams.set("scopes", [
    ...userScopes,
    ...botScopes.map((scope) => `bot:${scope}`),
  ].join(","));

  if (options.defaultWorkspaceId !== undefined) {
    url.searchParams.set("defaultWorkspaceId", options.defaultWorkspaceId);
  }
  if (options.state !== undefined) {
    url.searchParams.set("state", options.state);
  }
  if (options.isReinstall === true) {
    url.searchParams.set("isReinstall", "true");
  }

  return url.toString();
}

export function createPumbleOAuthAccessTokenRequest(
  options: CreatePumbleOAuthAccessTokenRequestOptions,
): PumbleOAuthAccessTokenRequest {
  const body = new FormData();
  body.set("client-id", required("clientId", options.clientId));
  body.set("client-secret", required("clientSecret", options.clientSecret));
  body.set("code", required("code", options.code));

  return {
    url: new URL(options.tokenUrl ?? PUMBLE_OAUTH_ACCESS_TOKEN_URL).toString(),
    init: {
      method: "POST",
      body,
    },
  };
}

export function verifyPumbleOAuthCallback(
  callbackUrl: string | URL,
  options: VerifyPumbleOAuthCallbackOptions = {},
): PumbleOAuthCallback {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  if (!code) {
    throw new Error("Pumble OAuth callback is missing code");
  }

  const state = url.searchParams.get("state") ?? undefined;
  if (options.expectedState !== undefined && state !== options.expectedState) {
    throw new Error("Pumble OAuth callback state mismatch");
  }

  return state === undefined ? { code } : { code, state };
}

function required(name: string, value: string): string {
  if (value.trim().length === 0) {
    throw new Error(`Pumble OAuth ${name} must not be empty`);
  }
  return value;
}
