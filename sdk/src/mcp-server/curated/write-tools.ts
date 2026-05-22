import { randomBytes } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
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
import type {
  AddReactionRequest,
  RemoveReactionRequest,
} from "../../models/operations/index.js";
import type { CuratedClient } from "./types.js";

export const CURATED_WRITE_TOOL_NAMES = [
  "preview_send_message",
  "send_message_confirmed",
  "preview_reply_to_thread",
  "reply_to_thread_confirmed",
  "add_reaction",
  "remove_reaction",
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
  channelId: nonBlank,
  channel: nonBlank.optional(),
  text: nonBlank,
  asBot: z.boolean().optional(),
}).strict();

const sendReplyRequestSchema = z.object({
  channelId: nonBlank,
  channel: nonBlank.optional(),
  messageId: nonBlank,
  text: nonBlank,
  alsoSendToChannel: z.boolean().optional(),
  asBot: z.boolean().optional(),
}).strict();

const addReactionRequestSchema = z.object({
  channelId: nonBlank,
  messageId: nonBlank,
  reaction: nonBlank,
}).strict();

const removeReactionRequestSchema = z.object({
  channelId: nonBlank,
  messageId: nonBlank,
  reaction: nonBlank,
}).strict();

const previewSendMessageSchema = sendMessageRequestSchema.shape satisfies z.ZodRawShape;
const previewReplyToThreadSchema = sendReplyRequestSchema.shape satisfies z.ZodRawShape;
const sendMessageConfirmedSchema = {
  request: sendMessageRequestSchema,
  preview: writePreviewSchema,
  confirmationToken: nonBlank,
} satisfies z.ZodRawShape;
const replyToThreadConfirmedSchema = {
  request: sendReplyRequestSchema,
  preview: writePreviewSchema,
  confirmationToken: nonBlank,
} satisfies z.ZodRawShape;
const addReactionSchema = addReactionRequestSchema.shape satisfies z.ZodRawShape;
const removeReactionSchema = removeReactionRequestSchema.shape satisfies z.ZodRawShape;

type PreviewSendMessageArgs = z.infer<typeof sendMessageRequestSchema>;
type PreviewReplyToThreadArgs = z.infer<typeof sendReplyRequestSchema>;
type ParsedWritePreview = z.infer<typeof writePreviewSchema>;
type SendMessageConfirmedArgs = z.infer<z.ZodObject<typeof sendMessageConfirmedSchema>>;
type ReplyToThreadConfirmedArgs = z.infer<z.ZodObject<typeof replyToThreadConfirmedSchema>>;
type AddReactionArgs = z.infer<typeof addReactionRequestSchema>;
type RemoveReactionArgs = z.infer<typeof removeReactionRequestSchema>;

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function jsonTool(run: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonResult(await run());
  } catch (error) {
    return errorResult(error);
  }
}

function requestOptions(ctx: ToolExtra): RequestOptions | undefined {
  return ctx.signal === undefined ? undefined : { signal: ctx.signal };
}

function sendMessagePreview(request: PreviewSendMessageArgs): WritePreview {
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

function replyToThreadPreview(request: PreviewReplyToThreadArgs): WritePreview {
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
    "preview_send_message",
    "Preview a channel message and return a local confirmation token.",
    previewSendMessageSchema,
    async (args: PreviewSendMessageArgs) =>
      jsonTool(async () => {
        const request = args;
        return previewPayload(request, sendMessagePreview(request), confirmationSecret);
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
        return client.messages.sendMessage(request, requestOptions(ctx));
      }),
  );

  server.tool(
    "preview_reply_to_thread",
    "Preview a thread reply and return a local confirmation token.",
    previewReplyToThreadSchema,
    async (args: PreviewReplyToThreadArgs) =>
      jsonTool(async () => {
        const request = args;
        return previewPayload(request, replyToThreadPreview(request), confirmationSecret);
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
        return client.messages.sendReply(request, requestOptions(ctx));
      }),
  );

  server.tool(
    "add_reaction",
    "Add a reaction using exact channel, message, and reaction identifiers.",
    addReactionSchema,
    async (args: AddReactionArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request: AddReactionRequest = args;
        return client.messages.addReaction(request, requestOptions(ctx));
      }),
  );

  server.tool(
    "remove_reaction",
    "Remove a reaction using exact channel, message, and reaction identifiers.",
    removeReactionSchema,
    async (args: RemoveReactionArgs, ctx: ToolExtra) =>
      jsonTool(async () => {
        const request: RemoveReactionRequest = args;
        return client.messages.removeReaction(request, requestOptions(ctx));
      }),
  );
}
