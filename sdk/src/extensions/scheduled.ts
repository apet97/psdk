import type { RequestOptions } from "../lib/sdks.js";
import type { ScheduledMessage } from "../models/scheduled-message.js";
import type { ScheduledMessageRef } from "../models/scheduled-message-ref.js";
import type {
  CreateScheduledMessageRequest,
  DeleteScheduledMessageRequest,
  EditScheduledMessageRequest,
  FetchScheduledMessageRequest,
  FetchScheduledMessagesRequest,
  FetchScheduledMessagesResponse,
} from "../models/operations/index.js";
import type { PageIterator } from "../types/operations.js";
import {
  asChannelId,
  asScheduledMessageId,
} from "./branded-ids.js";
import { displayChannel } from "./display.js";
import type {
  ChannelSummary,
  FacadeFailure,
  FacadeFindChannelResult,
  FacadeScheduleCreateRequest,
  FacadeScheduleEditRequest,
  FacadeScheduleListRequest,
  FacadeScheduledCancelReceipt,
  FacadeScheduledCreateReceipt,
  FacadeScheduledEditReceipt,
} from "./client.js";
import {
  createFacadeInvalidRequest,
  createFacadeOperationFailure,
} from "./facade-failure.js";
import {
  isFacadeOperationFailure,
  operationFailureNextAction,
  operationFailureReason,
} from "./facade-operation.js";

interface ScheduledRawClient {
  scheduledMessages: {
    createScheduledMessage(
      request: CreateScheduledMessageRequest,
      options?: RequestOptions,
    ): Promise<ScheduledMessageRef>;
    fetchScheduledMessages(
      request?: FetchScheduledMessagesRequest,
      options?: RequestOptions,
    ): Promise<PageIterator<FetchScheduledMessagesResponse, { cursor: string }>>;
    fetchScheduledMessage(
      request: FetchScheduledMessageRequest,
      options?: RequestOptions,
    ): Promise<ScheduledMessage>;
    editScheduledMessage(
      request: EditScheduledMessageRequest,
      options?: RequestOptions,
    ): Promise<ScheduledMessage>;
    deleteScheduledMessage(
      request: DeleteScheduledMessageRequest,
      options?: RequestOptions,
    ): Promise<void>;
  };
}

interface CreateScheduledFacadeOptions {
  raw: ScheduledRawClient;
  resolveFacadeChannel(input: string): Promise<FacadeFindChannelResult>;
  now?: () => number;
}

function invalidSendAt(sendAt: number, now: number): FacadeFailure<never> | undefined {
  if (!Number.isFinite(sendAt) || !Number.isInteger(sendAt)) {
    return createFacadeInvalidRequest(
      "scheduled.create requires sendAt as an epoch-millisecond integer.",
      "Pass a future epoch-millisecond timestamp.",
    );
  }
  if (sendAt <= now) {
    return createFacadeInvalidRequest(
      "scheduled.create requires sendAt to be in the future.",
      "Pass a sendAt value greater than Date.now().",
    );
  }
  return undefined;
}

export function createScheduledFacade({
  raw,
  resolveFacadeChannel,
  now = Date.now,
}: CreateScheduledFacadeOptions) {
  async function channelTarget(
    operation: string,
    channel: string | undefined,
    channelId: string | undefined,
    validateTarget: boolean | undefined,
  ): Promise<
    | { ok: true; channelId: string; channel?: ChannelSummary }
    | FacadeFailure<ChannelSummary>
  > {
    const input = channelId ?? channel;
    if (input === undefined || input.trim().length === 0) {
      return createFacadeInvalidRequest(
        `${operation} requires channel or channelId.`,
        "Pass channel, channelId, or preflight the target before writing.",
      );
    }
    if (channelId !== undefined && validateTarget !== true) {
      return { ok: true, channelId };
    }
    const resolved = await resolveFacadeChannel(input);
    if (!resolved.ok) return resolved;
    return { ok: true, channelId: resolved.channel.id, channel: resolved.channel };
  }

  async function create(
    request: FacadeScheduleCreateRequest,
    options?: RequestOptions,
  ): Promise<FacadeScheduledCreateReceipt | FacadeFailure<ChannelSummary>> {
    const sendAtFailure = invalidSendAt(request.sendAt, now());
    if (sendAtFailure) return sendAtFailure;
    const { channel, channelId, validateTarget, ...rest } = request;
    const target = await channelTarget("scheduled.create", channel, channelId, validateTarget);
    if (!target.ok) return target;
    const scheduledMessage = await raw.scheduledMessages.createScheduledMessage({
      ...rest,
      channelId: target.channelId,
    }, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected scheduled.create.",
        operationFailureNextAction,
        error,
      )
    );
    if (isFacadeOperationFailure(scheduledMessage)) return scheduledMessage;
    return {
      ok: true,
      summary: target.channel
        ? `Scheduled message ${scheduledMessage.id} in ${displayChannel(target.channel)}.`
        : `Scheduled message ${scheduledMessage.id} in channel ${target.channelId}.`,
      ids: {
        channelId: asChannelId(target.channelId),
        scheduledMessageId: asScheduledMessageId(scheduledMessage.id),
      },
      ...(target.channel ? { channel: target.channel } : {}),
      scheduledMessage,
    };
  }

  async function list(
    request: FacadeScheduleListRequest = {},
    options?: RequestOptions,
  ): Promise<
    | PageIterator<FetchScheduledMessagesResponse, { cursor: string }>
    | FacadeFailure<ChannelSummary>
  > {
    const { channel, channelId, validateTarget, ...rest } = request;
    if (channel === undefined && channelId === undefined) {
      return raw.scheduledMessages.fetchScheduledMessages(rest, options).catch((error: unknown) =>
        createFacadeOperationFailure(
          operationFailureReason(error),
          "Pumble API rejected scheduled.list.",
          operationFailureNextAction,
          error,
        )
      );
    }
    const target = await channelTarget("scheduled.list", channel, channelId, validateTarget);
    if (!target.ok) return target;
    return raw.scheduledMessages.fetchScheduledMessages({
      ...rest,
      channelId: target.channelId,
    }, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected scheduled.list.",
        operationFailureNextAction,
        error,
      )
    );
  }

  function get(
    request: FetchScheduledMessageRequest,
    options?: RequestOptions,
  ): Promise<ScheduledMessage | FacadeFailure<never>> {
    return raw.scheduledMessages.fetchScheduledMessage(request, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected scheduled.get.",
        operationFailureNextAction,
        error,
      )
    );
  }

  async function edit(
    request: FacadeScheduleEditRequest,
    options?: RequestOptions,
  ): Promise<FacadeScheduledEditReceipt | FacadeFailure<ChannelSummary>> {
    const sendAtFailure = invalidSendAt(request.sendAt, now());
    if (sendAtFailure) return sendAtFailure;
    const { channel, channelId, validateTarget, ...rest } = request;
    const target = await channelTarget("scheduled.edit", channel, channelId, validateTarget);
    if (!target.ok) return target;
    const scheduledMessage = await raw.scheduledMessages.editScheduledMessage({
      ...rest,
      channelId: target.channelId,
    }, options).catch((error: unknown) =>
      createFacadeOperationFailure(
        operationFailureReason(error),
        "Pumble API rejected scheduled.edit.",
        operationFailureNextAction,
        error,
      )
    );
    if (isFacadeOperationFailure(scheduledMessage)) return scheduledMessage;
    return {
      ok: true,
      summary: `Updated scheduled message ${scheduledMessage.id}.`,
      ids: {
        channelId: asChannelId(target.channelId),
        scheduledMessageId: asScheduledMessageId(scheduledMessage.id),
      },
      ...(target.channel ? { channel: target.channel } : {}),
      scheduledMessage,
    };
  }

  async function cancel(
    request: DeleteScheduledMessageRequest,
    options?: RequestOptions,
  ): Promise<FacadeScheduledCancelReceipt | FacadeFailure<never>> {
    const result = await raw.scheduledMessages.deleteScheduledMessage(request, options)
      .then(() => ({ ok: true as const }))
      .catch((error: unknown) =>
        createFacadeOperationFailure(
          operationFailureReason(error),
          "Pumble API rejected scheduled.cancel.",
          operationFailureNextAction,
          error,
        )
      );
    if (isFacadeOperationFailure(result)) return result;
    return {
      ok: true,
      summary: `Canceled scheduled message ${request.scheduledMessageId}.`,
      ids: { scheduledMessageId: asScheduledMessageId(request.scheduledMessageId) },
    };
  }

  return { create, list, get, edit, cancel };
}
