import { randomBytes } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import {
  createConfirmationToken,
  createWritePreview,
  verifyConfirmationToken,
  type ConfirmationSecret,
  type WriteAction,
  type WritePreview,
} from "../../extensions/write-plan.js";
import type { RequestOptions } from "../../lib/sdks.js";
import {
  isFailurePayload,
  jsonTool,
  okPayload,
  type CuratedFailurePayload,
} from "./payloads.js";
import { resolveCuratedChannelTarget } from "./targets.js";
import type { CuratedClient } from "./types.js";

export const CURATED_WRITE_TOOL_NAMES = [
  "send_message_preview",
  "send_message_confirmed",
  "reply_to_thread_preview",
  "reply_to_thread_confirmed",
] as const;

export interface CuratedWriteToolOptions {
  readonly confirmationSecret?: ConfirmationSecret | undefined;
}

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const defaultConfirmationSecret = randomBytes(32);
const nonBlank = z.string().trim().min(1);
const riskLevel = z.enum(["low", "medium", "high"]);

const writePreviewSchema = z.object({
  actionType: nonBlank,
  targetKind: nonBlank,
  targetId: nonBlank.optional(),
  targetName: nonBlank.optional(),
  textExcerpt: z.string(),
  riskLevel,
}).strict();

const sendMessageRequestSchema = z.object({
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  text: nonBlank,
  asBot: z.boolean().optional(),
}).strict();

const sendReplyRequestSchema = z.object({
  channelId: nonBlank.optional(),
  channel: nonBlank.optional(),
  messageId: nonBlank,
  text: nonBlank,
  alsoSendToChannel: z.boolean().optional(),
  asBot: z.boolean().optional(),
}).strict();

const confirmedSendMessageRequestSchema = sendMessageRequestSchema.extend({
  channelId: nonBlank,
}).strict();

const confirmedSendReplyRequestSchema = sendReplyRequestSchema.extend({
  channelId: nonBlank,
}).strict();

const previewSendMessageSchema = sendMessageRequestSchema.shape satisfies z.ZodRawShape;
const previewReplyToThreadSchema = sendReplyRequestSchema.shape satisfies z.ZodRawShape;
const sendMessageConfirmedSchema = {
  request: confirmedSendMessageRequestSchema,
  preview: writePreviewSchema,
  confirmationToken: nonBlank,
} satisfies z.ZodRawShape;
const replyToThreadConfirmedSchema = {
  request: confirmedSendReplyRequestSchema,
  preview: writePreviewSchema,
  confirmationToken: nonBlank,
} satisfies z.ZodRawShape;

type PreviewSendMessageArgs = z.infer<typeof sendMessageRequestSchema>;
type PreviewReplyToThreadArgs = z.infer<typeof sendReplyRequestSchema>;
type ParsedWritePreview = z.infer<typeof writePreviewSchema>;
type SendMessageConfirmedArgs = z.infer<z.ZodObject<typeof sendMessageConfirmedSchema>>;
type ReplyToThreadConfirmedArgs = z.infer<z.ZodObject<typeof replyToThreadConfirmedSchema>>;

function requestOptions(ctx: ToolExtra): RequestOptions | undefined {
  return ctx.signal === undefined ? undefined : { signal: ctx.signal };
}

async function resolveWriteChannel<T extends { channelId?: string | undefined; channel?: string | undefined }>(
  client: CuratedClient,
  toolName: string,
  args: T,
): Promise<
  | (T & { channelId: string; channel?: string | undefined })
  | CuratedFailurePayload
> {
  const target = await resolveCuratedChannelTarget(client, toolName, args);
  if (isFailurePayload(target)) return target;
  return { ...args, channelId: target.channelId, channel: target.channelName };
}

function sendMessagePreview(request: PreviewSendMessageArgs & { channelId: string }): WritePreview {
  const action: WriteAction = {
    type: "send_message",
    targetKind: "channel",
    targetId: request.channelId,
    text: request.text,
    riskLevel: "medium",
  };
  if (request.channel !== undefined) action.targetName = request.channel;
  return createWritePreview(action);
}

function replyToThreadPreview(request: PreviewReplyToThreadArgs & { channelId: string }): WritePreview {
  const action: WriteAction = {
    type: "reply_to_thread",
    targetKind: "thread",
    targetId: `${request.channelId}/${request.messageId}`,
    text: request.text,
    riskLevel: "medium",
  };
  if (request.channel !== undefined) action.targetName = request.channel;
  return createWritePreview(action);
}

function previewPayload<TRequest>(
  request: TRequest,
  preview: WritePreview,
  confirmationSecret: ConfirmationSecret,
): { request: TRequest; preview: WritePreview; confirmationToken: string } {
  return {
    request,
    preview,
    confirmationToken: createConfirmationToken(preview, confirmationSecret),
  };
}

function requireConfirmedPreview(
  toolName: string,
  parsedPreview: ParsedWritePreview,
  confirmationToken: string,
  expectedPreview: WritePreview,
  confirmationSecret: ConfirmationSecret,
): void {
  const preview = normalizePreview(parsedPreview);
  if (!verifyConfirmationToken(preview, confirmationToken, confirmationSecret)) {
    throw new Error(`${toolName}: confirmation token does not match preview`);
  }
  if (!samePreview(preview, expectedPreview)) {
    throw new Error(`${toolName}: request does not match confirmation preview`);
  }
}

function normalizePreview(preview: ParsedWritePreview): WritePreview {
  const normalized: WritePreview = {
    actionType: preview.actionType,
    targetKind: preview.targetKind,
    textExcerpt: preview.textExcerpt,
    riskLevel: preview.riskLevel,
  };
  if (preview.targetId !== undefined) normalized.targetId = preview.targetId;
  if (preview.targetName !== undefined) normalized.targetName = preview.targetName;
  return normalized;
}

function samePreview(left: WritePreview, right: WritePreview): boolean {
  return left.actionType === right.actionType
    && left.targetKind === right.targetKind
    && left.targetId === right.targetId
    && left.targetName === right.targetName
    && left.textExcerpt === right.textExcerpt
    && left.riskLevel === right.riskLevel;
}

export function registerCuratedWriteTools(
  server: McpServer,
  client: CuratedClient,
  options: CuratedWriteToolOptions = {},
): void {
  const confirmationSecret = options.confirmationSecret ?? defaultConfirmationSecret;

  server.tool(
    "send_message_preview",
    "Preview a channel message and return a local confirmation token.",
    previewSendMessageSchema,
    async (args: PreviewSendMessageArgs) =>
      jsonTool(async () => {
        const request = await resolveWriteChannel(client, "send_message_preview", args);
        if (isFailurePayload(request)) return request;
        const preview = sendMessagePreview(request);
        return okPayload(
          `Preview ready to send a message to ${request.channel ?? request.channelId}.`,
          previewPayload(request, preview, confirmationSecret),
          { channelId: request.channelId },
          ["Call send_message_confirmed with this request, preview, and confirmationToken."],
        );
      }),
  );

  server.tool(
    "send_message_confirmed",
    "Send a channel message only after preview/token confirmation.",
    sendMessageConfirmedSchema,
    async (args: SendMessageConfirmedArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request = args.request;
        requireConfirmedPreview(
          "send_message_confirmed",
          args.preview,
          args.confirmationToken,
          sendMessagePreview(request),
          confirmationSecret,
        );
        const message = await client.messages.sendMessage(request, requestOptions(ctx));
        return okPayload(`Sent message ${message.id}.`, message, {
          channelId: message.channelId,
          messageId: message.id,
        });
      }),
  );

  server.tool(
    "reply_to_thread_preview",
    "Preview a thread reply and return a local confirmation token.",
    previewReplyToThreadSchema,
    async (args: PreviewReplyToThreadArgs) =>
      jsonTool(async () => {
        const request = await resolveWriteChannel(client, "reply_to_thread_preview", args);
        if (isFailurePayload(request)) return request;
        const preview = replyToThreadPreview(request);
        return okPayload(
          `Preview ready to reply to thread ${request.messageId}.`,
          previewPayload(request, preview, confirmationSecret),
          { channelId: request.channelId, rootMessageId: request.messageId },
          ["Call reply_to_thread_confirmed with this request, preview, and confirmationToken."],
        );
      }),
  );

  server.tool(
    "reply_to_thread_confirmed",
    "Reply to a thread only after preview/token confirmation.",
    replyToThreadConfirmedSchema,
    async (args: ReplyToThreadConfirmedArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request = args.request;
        requireConfirmedPreview(
          "reply_to_thread_confirmed",
          args.preview,
          args.confirmationToken,
          replyToThreadPreview(request),
          confirmationSecret,
        );
        const message = await client.messages.sendReply(request, requestOptions(ctx));
        return okPayload(`Sent reply ${message.id}.`, message, {
          channelId: message.channelId,
          messageId: message.id,
          rootMessageId: request.messageId,
        });
      }),
  );
}
