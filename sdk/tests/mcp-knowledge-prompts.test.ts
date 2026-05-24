import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import * as z from "zod/v3";
import {
  CURATED_PROMPT_NAMES,
  registerCuratedPrompts,
} from "../src/mcp-server/curated/prompts.js";

type PromptHandler = (
  args: Record<string, unknown>,
  extra: { signal?: AbortSignal },
) => GetPromptResult | Promise<GetPromptResult>;

interface CapturedPrompt {
  readonly name: string;
  readonly config: {
    readonly description?: string;
    readonly argsSchema?: z.ZodRawShape;
  };
  readonly handler: PromptHandler;
}

class FakeServer {
  readonly prompts = new Map<string, CapturedPrompt>();

  registerPrompt(
    name: string,
    config: CapturedPrompt["config"],
    handler: PromptHandler,
  ): void {
    this.prompts.set(name, { name, config, handler });
  }

  registerResource(): void {
    // No-op for these tests.
  }
}

function registerPrompts(): FakeServer {
  const server = new FakeServer();
  registerCuratedPrompts(server as never);
  return server;
}

function parsePromptArgs(
  prompt: CapturedPrompt,
  args: Record<string, unknown>,
): Record<string, unknown> {
  return prompt.config.argsSchema === undefined
    ? args
    : z.object(prompt.config.argsSchema).parse(args);
}

async function invokePrompt(
  server: FakeServer,
  name: string,
  args: Record<string, unknown>,
): Promise<GetPromptResult> {
  const prompt = server.prompts.get(name);
  if (prompt === undefined) throw new Error(`missing prompt: ${name}`);
  return prompt.handler(parsePromptArgs(prompt, args), {});
}

function promptText(result: GetPromptResult): string {
  expect(result.messages.length).toBeGreaterThan(0);
  const [messageResult] = result.messages;
  expect(messageResult?.role).toBe("user");
  expect(messageResult?.content.type).toBe("text");
  return messageResult?.content.type === "text" ? messageResult.content.text : "";
}

describe("mcp knowledge prompts", () => {
  it("CURATED_PROMPT_NAMES includes the new entries", () => {
    expect(CURATED_PROMPT_NAMES).toEqual(
      expect.arrayContaining(["write_pumble_handler", "debug_pumble_webhook"]),
    );
  });

  it("registers both new prompts under registerCuratedPrompts", () => {
    const server = registerPrompts();
    expect(server.prompts.has("write_pumble_handler")).toBe(true);
    expect(server.prompts.has("debug_pumble_webhook")).toBe(true);
  });

  it("write_pumble_handler references the event resource and extension barrel", async () => {
    const server = registerPrompts();
    const text = promptText(await invokePrompt(server, "write_pumble_handler", {
      event: "Message",
    }));
    expect(text).toContain("pumble://events/Message");
    expect(text).toContain("pumble-keys-sdk/extensions");
    expect(text).toContain("typescript");
  });

  it("write_pumble_handler honours the language argument", async () => {
    const server = registerPrompts();
    const text = promptText(await invokePrompt(server, "write_pumble_handler", {
      event: "Reaction",
      language: "javascript",
    }));
    expect(text).toContain("javascript");
    expect(text).toContain("pumble://events/Reaction");
  });

  it("write_pumble_handler rejects an empty event name", () => {
    const server = registerPrompts();
    expect(() =>
      parsePromptArgs(server.prompts.get("write_pumble_handler")!, { event: "" }),
    ).toThrow();
  });

  it("debug_pumble_webhook validates JSON and walks through discrimination", async () => {
    const server = registerPrompts();
    const text = promptText(await invokePrompt(server, "debug_pumble_webhook", {
      payloadJson: '{"ty":"NEW_MESSAGE","aId":"u1","cId":"c1"}',
    }));
    expect(text).toContain("pumble://knowledge/upstream/events/README.md");
    expect(text).toContain("Notification");
    expect(text).toContain("ty");
  });

  it("debug_pumble_webhook rejects unparseable JSON", async () => {
    const server = registerPrompts();
    const prompt = server.prompts.get("debug_pumble_webhook")!;
    const args = parsePromptArgs(prompt, { payloadJson: "not actually json" });
    await expect(async () => prompt.handler(args, {})).rejects.toThrow(/parseable JSON/i);
  });

  it("debug_pumble_webhook rejects an empty payloadJson via zod", () => {
    const server = registerPrompts();
    expect(() =>
      parsePromptArgs(server.prompts.get("debug_pumble_webhook")!, {
        payloadJson: "",
      }),
    ).toThrow();
  });
});
