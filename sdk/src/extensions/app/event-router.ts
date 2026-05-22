import type {
  PumbleWebhookEvent,
  PumbleWebhookEventType,
} from "../webhook-events.js";

export type PumbleEventRouterContext = Record<string, unknown>;

export interface PumbleEventDispatchResult {
  handled: number;
}

export type PumbleEventHandler<
  TType extends PumbleWebhookEventType = PumbleWebhookEventType,
  TContext = PumbleEventRouterContext,
> = (event: PumbleWebhookEvent<TType>, context: TContext) => void | Promise<void>;

export interface PumbleEventRouter<TContext = PumbleEventRouterContext> {
  on<TType extends PumbleWebhookEventType>(
    type: TType,
    handler: PumbleEventHandler<TType, TContext>,
  ): PumbleEventRouter<TContext>;
  dispatch<TType extends PumbleWebhookEventType>(
    event: PumbleWebhookEvent<TType>,
    context: TContext,
  ): Promise<PumbleEventDispatchResult>;
}

type InternalHandler<TContext> = (
  event: PumbleWebhookEvent,
  context: TContext,
) => void | Promise<void>;

export function createPumbleEventRouter<TContext = PumbleEventRouterContext>(): PumbleEventRouter<TContext> {
  const handlers = new Map<PumbleWebhookEventType, Array<InternalHandler<TContext>>>();

  const router: PumbleEventRouter<TContext> = {
    on(type, handler) {
      const registered = handlers.get(type);
      const internalHandler = handler as unknown as InternalHandler<TContext>;
      if (registered === undefined) {
        handlers.set(type, [internalHandler]);
      } else {
        registered.push(internalHandler);
      }
      return router;
    },

    async dispatch(event, context) {
      const registered = handlers.get(event.type) ?? [];
      let handled = 0;
      for (const handler of registered) {
        try {
          await handler(event, context);
          handled++;
        } catch (cause) {
          throw eventHandlerError(event.type, cause);
        }
      }
      return { handled };
    },
  };

  return router;
}

function eventHandlerError(type: PumbleWebhookEventType, cause: unknown): Error {
  const suffix = cause instanceof Error && cause.message.length > 0
    ? `: ${cause.message}`
    : "";
  return new Error(`Pumble event handler failed for ${type}${suffix}`, { cause });
}
