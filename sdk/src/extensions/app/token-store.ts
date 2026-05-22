export interface PumbleOAuthAccessTokenResponse {
  accessToken: string;
  botToken?: string;
  userId: string;
  botId?: string;
  workspaceId: string;
}

export interface TokenStore {
  getBotToken(workspaceId: string): Promise<string | undefined>;
  getUserToken(workspaceId: string, workspaceUserId: string): Promise<string | undefined>;
  getBotUserId(workspaceId: string): Promise<string | undefined>;
  saveTokens(accessTokenResponse: PumbleOAuthAccessTokenResponse): Promise<void>;
  deleteForWorkspace(workspaceId: string): Promise<void>;
  deleteForUser(workspaceUserId: string, workspaceId: string): Promise<void>;
  initialize(): Promise<void>;
}

interface WorkspaceTokens {
  botToken?: string;
  botUserId?: string;
  userTokens: Map<string, string>;
}

export class InMemoryTokenStore implements TokenStore {
  readonly #workspaces = new Map<string, WorkspaceTokens>();

  async initialize(): Promise<void> {
    // No external resource to open; tokens remain process-local.
  }

  async getBotToken(workspaceId: string): Promise<string | undefined> {
    return this.#workspaces.get(workspaceId)?.botToken;
  }

  async getUserToken(workspaceId: string, workspaceUserId: string): Promise<string | undefined> {
    return this.#workspaces.get(workspaceId)?.userTokens.get(workspaceUserId);
  }

  async getBotUserId(workspaceId: string): Promise<string | undefined> {
    return this.#workspaces.get(workspaceId)?.botUserId;
  }

  async saveTokens(response: PumbleOAuthAccessTokenResponse): Promise<void> {
    const workspace = this.#workspaces.get(response.workspaceId) ?? {
      userTokens: new Map<string, string>(),
    };

    workspace.userTokens.set(response.userId, response.accessToken);
    if (response.botToken !== undefined) {
      workspace.botToken = response.botToken;
    }
    if (response.botId !== undefined) {
      workspace.botUserId = response.botId;
    }
    this.#workspaces.set(response.workspaceId, workspace);
  }

  async deleteForWorkspace(workspaceId: string): Promise<void> {
    this.#workspaces.delete(workspaceId);
  }

  async deleteForUser(workspaceUserId: string, workspaceId: string): Promise<void> {
    this.#workspaces.get(workspaceId)?.userTokens.delete(workspaceUserId);
  }
}
