import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
import { expect } from "vitest";
import {
  registerCuratedTools,
  type CuratedToolOptions,
} from "../../src/mcp-server/curated/tools.js";

type CapturedHandler = (
  args: Record<string, unknown>,
  extra: { signal?: AbortSignal },
) => CallToolResult | Promise<CallToolResult>;

export interface CapturedTool {
  readonly name: string;
  readonly description: string;
  readonly schema?: z.ZodRawShape;
  readonly handler: CapturedHandler;
}

class FakeServer {
  readonly tools = new Map<string, CapturedTool>();

  tool(name: string, description: string, ...rest: unknown[]): void {
    const handler = rest.at(-1);
    if (typeof handler !== "function") {
      throw new Error(`tool ${name} did not register a handler`);
    }

    const schema = rest.length === 2 ? rest[0] as z.ZodRawShape : undefined;
    this.tools.set(name, {
      name,
      description,
      schema,
      handler: handler as CapturedHandler,
    });
  }
}

function textContent(result: CallToolResult): string {
  expect(result.content).toHaveLength(1);
  const [content] = result.content;
  expect(content?.type).toBe("text");
  return content?.type === "text" ? content.text : "";
}

export function registerCuratedHarness(client: unknown, options?: CuratedToolOptions) {
  const server = new FakeServer();
  registerCuratedTools(server as never, client as never, options);

  return {
    tools: server.tools,
    toolNames() {
      return [...server.tools.keys()];
    },
    tool(name: string): CapturedTool | undefined {
      return server.tools.get(name);
    },
    parseArgs(name: string, args: Record<string, unknown>): Record<string, unknown> {
      const tool = server.tools.get(name);
      if (tool === undefined) {
        throw new Error(`missing tool: ${name}`);
      }
      return tool.schema === undefined ? args : z.object(tool.schema).parse(args);
    },
    async invoke(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
      const tool = server.tools.get(name);
      if (tool === undefined) {
        throw new Error(`missing tool: ${name}`);
      }
      return tool.handler(this.parseArgs(name, args), {});
    },
    json<T = Record<string, unknown>>(
      result: CallToolResult,
      options: { compact?: boolean } = {},
    ): T {
      expect(result.isError).toBeUndefined();
      const text = textContent(result);
      if (options.compact) {
        expect(text).not.toContain("attachments");
        expect(text).not.toContain("reactions");
        expect(text).not.toContain("highlightedBlocks");
      }
      return JSON.parse(text) as T;
    },
    errorText(result: CallToolResult): string {
      expect(result.isError).toBe(true);
      return textContent(result);
    },
  };
}
