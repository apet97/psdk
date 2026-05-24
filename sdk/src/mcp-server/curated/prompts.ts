import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";

export const CURATED_PROMPT_NAMES = [
  "summarize_thread",
  "draft_reply",
  "write_pumble_handler",
  "debug_pumble_webhook",
] as const;

const nonBlank = z.string().trim().min(1);

const summarizeThreadSchema = {
  channelId: nonBlank,
  messageId: nonBlank,
  focus: z.string().trim().optional(),
} satisfies z.ZodRawShape;

const draftReplySchema = {
  channelId: nonBlank,
  messageId: nonBlank,
  replyGoal: z.string().trim().optional(),
} satisfies z.ZodRawShape;

const writeHandlerSchema = {
  event: nonBlank,
  language: z.enum(["typescript", "javascript"]).default("typescript"),
} satisfies z.ZodRawShape;

const debugWebhookSchema = {
  payloadJson: nonBlank,
} satisfies z.ZodRawShape;

type SummarizeThreadArgs = z.infer<z.ZodObject<typeof summarizeThreadSchema>>;
type DraftReplyArgs = z.infer<z.ZodObject<typeof draftReplySchema>>;
type WriteHandlerArgs = z.infer<z.ZodObject<typeof writeHandlerSchema>>;
type DebugWebhookArgs = z.infer<z.ZodObject<typeof debugWebhookSchema>>;

function promptText(text: string): GetPromptResult {
  return {
    messages: [{
      role: "user",
      content: { type: "text", text },
    }],
  };
}

function threadUri(channelId: string, messageId: string): string {
  return `pumble://thread/${channelId}/${messageId}`;
}

export function registerCuratedPrompts(server: McpServer): void {
  server.registerPrompt(
    "summarize_thread",
    {
      description: "Summarize a Pumble thread from its curated thread resource.",
      argsSchema: summarizeThreadSchema,
    },
    (args: SummarizeThreadArgs) => {
      const focus = args.focus === undefined || args.focus.length === 0
        ? "key decisions, blockers, owners, and unresolved questions"
        : args.focus;

      return promptText([
        `Read ${threadUri(args.channelId, args.messageId)} before answering.`,
        `Summarize the thread with focus on ${focus}.`,
        "Do not send messages or modify Pumble. If follow-up communication is needed, draft it for the user only.",
      ].join("\n"));
    },
  );

  server.registerPrompt(
    "draft_reply",
    {
      description: "Draft a safe Pumble thread reply without sending it.",
      argsSchema: draftReplySchema,
    },
    (args: DraftReplyArgs) => {
      const goal = args.replyGoal === undefined || args.replyGoal.length === 0
        ? "write a concise, context-aware reply"
        : args.replyGoal;

      return promptText([
        `Read ${threadUri(args.channelId, args.messageId)} before drafting.`,
        `Draft a thread reply that satisfies this goal: ${goal}.`,
        "Do not send the reply yourself.",
        "If the user chooses to send, call reply_to_thread_preview first, show the preview and confirmation token, and only after explicit user confirmation call reply_to_thread_confirmed with the unchanged request, preview, and token.",
      ].join("\n"));
    },
  );

  server.registerPrompt(
    "write_pumble_handler",
    {
      description: "Generate a typed handler skeleton for a Pumble event payload.",
      argsSchema: writeHandlerSchema,
    },
    (args: WriteHandlerArgs) => {
      return promptText([
        `Write a ${args.language} handler for Pumble event "${args.event}".`,
        "",
        `1. Read the typed payload via the MCP resource \`pumble://events/${args.event}\`.`,
        `   Use the upstream \`Notification${args.event}\` type as the source of truth.`,
        "2. Import the relevant facade helpers from `pumble-keys-sdk/extensions/index.js`.",
        "3. Validate inputs (channel id, message id, user id) with the branded ID helpers from the same barrel.",
        "4. Return a value-style result that mirrors the facade's `FacadeResult` shape ({ ok, summary, ids, data, nextActions }).",
        "5. Do not call `ack()` or assume slash-command / view-submission semantics — those belong to the upstream OAuth-app SDK, not the API-Keys add-on.",
      ].join("\n"));
    },
  );

  server.registerPrompt(
    "debug_pumble_webhook",
    {
      description:
        "Walk through an unknown Pumble webhook payload using the curated MCP knowledge resources.",
      argsSchema: debugWebhookSchema,
    },
    (args: DebugWebhookArgs) => {
      try {
        JSON.parse(args.payloadJson);
      } catch {
        throw new Error("payloadJson must be parseable JSON");
      }

      return promptText([
        "Identify this Pumble payload step by step:",
        "",
        "```json",
        args.payloadJson,
        "```",
        "",
        "1. Read `pumble://knowledge/upstream/events/README.md` for the short-form field glossary (`aId`, `cId`, `tx`, `mId`, `eph`, `ty`, `wId`).",
        "2. Identify the event from the top-level `ty` discriminator.",
        "3. Read the relevant `pumble://events/{name}` resource and map the payload fields to the typed `Notification*` shape.",
        "4. Call out which fields are present, which are missing or null, and which look suspicious (wrong shape, mismatched id format, redacted-looking values).",
        "5. Output: the event type, the parsed key fields, and any anomalies you found.",
      ].join("\n"));
    },
  );
}
