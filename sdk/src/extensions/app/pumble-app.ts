import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import {
  type CreateWebhookHandlerOptions,
  createWebhookHandler,
  type WebhookHandlers,
} from "../webhooks.js";
import type {
  PumbleWebhookEvent,
  PumbleWebhookEventType,
} from "../webhook-events.js";
import {
  createPumbleEventRouter,
  type PumbleEventHandler,
  type PumbleEventRouter,
  type PumbleEventRouterContext,
} from "./event-router.js";
import {
  handleRawWebhook,
  type PumbleNodeWebhookHandler,
  type PumbleWebhookHttpResult,
  type PumbleWebhookRawBody,
} from "./http-receiver.js";

export type PumbleAppEventContext = PumbleEventRouterContext;

export interface PumbleAppOptions extends Omit<CreateWebhookHandlerOptions, "handlers"> {}

export class PumbleApp {
  readonly #router: PumbleEventRouter<PumbleAppEventContext>;
  readonly #webhookHandler: PumbleNodeWebhookHandler;

  constructor(signingSecret: string);
  constructor(options: PumbleAppOptions);
  constructor(optionsOrSigningSecret: string | PumbleAppOptions) {
    const options = typeof optionsOrSigningSecret === "string"
      ? { signingSecret: optionsOrSigningSecret }
      : optionsOrSigningSecret;

    this.#router = createPumbleEventRouter<PumbleAppEventContext>();
    this.#webhookHandler = createWebhookHandler({
      ...options,
      handlers: routerWebhookHandlers(this.#router),
    });
  }

  event<TType extends PumbleWebhookEventType>(
    type: TType,
    handler: PumbleEventHandler<TType, PumbleAppEventContext>,
  ): this {
    this.#router.on(type, handler);
    return this;
  }

  async handleWebhook(
    rawBody: PumbleWebhookRawBody,
    headers: IncomingHttpHeaders,
  ): Promise<PumbleWebhookHttpResult> {
    return handleRawWebhook(rawBody, headers, this.#webhookHandler);
  }

  createExpressHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
    return async (req, res) => {
      await this.#webhookHandler(req, res);
    };
  }
}

function routerWebhookHandlers(router: PumbleEventRouter<PumbleAppEventContext>): WebhookHandlers {
  return {
    onNewMessage: async (event) => {
      await dispatch(router, event);
    },
    onUpdatedMessage: async (event) => {
      await dispatch(router, event);
    },
    onReactionAdded: async (event) => {
      await dispatch(router, event);
    },
    onChannelCreated: async (event) => {
      await dispatch(router, event);
    },
    onAppUninstalled: async (event) => {
      await dispatch(router, event);
    },
    onAppUnauthorized: async (event) => {
      await dispatch(router, event);
    },
    onWorkspaceUserJoined: async (event) => {
      await dispatch(router, event);
    },
  };
}

async function dispatch<TType extends PumbleWebhookEventType>(
  router: PumbleEventRouter<PumbleAppEventContext>,
  event: PumbleWebhookEvent<TType>,
): Promise<void> {
  await router.dispatch(event, {});
}
