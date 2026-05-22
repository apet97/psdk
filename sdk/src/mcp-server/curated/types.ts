import type { SDKOptions } from "../../lib/config.js";
import type { PumbleSDK } from "../../sdk/sdk.js";

export type CuratedTransport = "stdio" | "sse";

export interface CuratedServerOptions {
  readonly apiKeyAuth?: SDKOptions["apiKeyAuth"] | undefined;
  readonly serverURL?: SDKOptions["serverURL"] | undefined;
  readonly serverIdx?: SDKOptions["serverIdx"] | undefined;
}

export interface CuratedStartOptions extends CuratedServerOptions {
  readonly transport: CuratedTransport;
  readonly port: number;
  readonly env?: readonly [string, string][] | undefined;
}

export type CuratedClient = Pick<PumbleSDK, "channels" | "users">;
