import { describe, expect, it } from "vitest";
import {
  createPumbleOAuthAccessTokenRequest,
  createPumbleOAuthAuthorizationUrl,
  InMemoryTokenStore,
  verifyPumbleOAuthCallback,
} from "../src/extensions/app/index.js";

describe("Pumble app OAuth helpers", () => {
  it("builds a verified Pumble authorization URL without inventing parameters", () => {
    const url = new URL(createPumbleOAuthAuthorizationUrl({
      clientId: "app-123",
      redirectUrl: "https://example.com/pumble/oauth/callback",
      userScopes: ["messages:read", "messages:write"],
      botScopes: ["messages:read"],
      defaultWorkspaceId: "workspace-123",
      state: "csrf-token",
      isReinstall: true,
    }));

    expect(url.origin + url.pathname).toBe("https://app.pumble.com/access-request");
    expect(url.searchParams.get("redirectUrl")).toBe("https://example.com/pumble/oauth/callback");
    expect(url.searchParams.get("clientId")).toBe("app-123");
    expect(url.searchParams.get("scopes")).toBe("messages:read,messages:write,bot:messages:read");
    expect(url.searchParams.get("defaultWorkspaceId")).toBe("workspace-123");
    expect(url.searchParams.get("state")).toBe("csrf-token");
    expect(url.searchParams.get("isReinstall")).toBe("true");
    expect([...url.searchParams.keys()].sort()).toEqual([
      "clientId",
      "defaultWorkspaceId",
      "isReinstall",
      "redirectUrl",
      "scopes",
      "state",
    ]);
  });

  it("builds the verified Pumble access-token request body", () => {
    const request = createPumbleOAuthAccessTokenRequest({
      clientId: "app-123",
      clientSecret: "secret-123",
      code: "auth-code",
    });

    expect(request.url).toBe("https://api-ga.pumble.com/oauth2/access");
    expect(request.init.method).toBe("POST");
    expect(request.init.body).toBeInstanceOf(FormData);

    const body = request.init.body as FormData;
    expect(body.get("client-id")).toBe("app-123");
    expect(body.get("client-secret")).toBe("secret-123");
    expect(body.get("code")).toBe("auth-code");
    expect([...body.keys()].sort()).toEqual(["client-id", "client-secret", "code"]);
  });

  it("verifies callback code and optional state", () => {
    expect(verifyPumbleOAuthCallback(
      "https://example.com/pumble/oauth/callback?code=auth-code&state=csrf-token",
      { expectedState: "csrf-token" },
    )).toEqual({ code: "auth-code", state: "csrf-token" });

    expect(() => verifyPumbleOAuthCallback("https://example.com/callback")).toThrow(
      /OAuth callback is missing code/,
    );
    expect(() => verifyPumbleOAuthCallback(
      "https://example.com/callback?code=auth-code&state=wrong",
      { expectedState: "csrf-token" },
    )).toThrow(/OAuth callback state mismatch/);
  });

  it("stores and deletes Pumble user and bot tokens in memory only", async () => {
    const store = new InMemoryTokenStore();

    await store.initialize();
    await store.saveTokens({
      workspaceId: "workspace-123",
      userId: "user-123",
      accessToken: "user-token",
      botId: "bot-123",
      botToken: "bot-token",
    });

    await expect(store.getUserToken("workspace-123", "user-123")).resolves.toBe("user-token");
    await expect(store.getBotToken("workspace-123")).resolves.toBe("bot-token");
    await expect(store.getBotUserId("workspace-123")).resolves.toBe("bot-123");

    await store.deleteForUser("user-123", "workspace-123");
    await expect(store.getUserToken("workspace-123", "user-123")).resolves.toBeUndefined();
    await expect(store.getBotToken("workspace-123")).resolves.toBe("bot-token");

    await store.deleteForWorkspace("workspace-123");
    await expect(store.getBotToken("workspace-123")).resolves.toBeUndefined();
  });
});
