import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";

export const CURATED_PROMPT_NAMES = [
  "summarize_thread",
  "draft_reply",
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

type SummarizeThreadArgs = z.infer<z.ZodObject<typeof summarizeThreadSchema>>;
type DraftReplyArgs = z.infer<z.ZodObject<typeof draftReplySchema>>;

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
}
