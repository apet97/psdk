import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it, vi } from "vitest";
import {
  CURATED_RESOURCE_NAMES,
  registerCuratedResources,
} from "../src/mcp-server/curated/resources.js";

type ResourceHandler = (
  uri: URL,
  variables: Record<string, string>,
  extra: { signal?: AbortSignal },
) => ReadResourceResult | Promise<ReadResourceResult>;

interface CapturedResource {
  readonly name: string;
  readonly template: unknown;
  readonly config: Record<string, unknown>;
  readonly handler: ResourceHandler;
}

class FakeServer {
  readonly resources = new Map<string, CapturedResource>();

  registerResource(
    name: string,
    template: unknown,
    config: Record<string, unknown>,
    handler: ResourceHandler,
  ): void {
    this.resources.set(name, { name, template, config, handler });
  }

  registerPrompt(): void {
    // No-op for these tests.
  }
}

function registerResources(): FakeServer {
  const server = new FakeServer();
  const client = {
    messages: {
      listMessages: vi.fn(),
      fetchMessage: vi.fn(),
      fetchThreadReplies: vi.fn(),
    },
  };
  registerCuratedResources(server as never, client as never);
  return server;
}

function templateUri(template: unknown): string {
  const candidate = template as { uriTemplate?: { toString(): string } };
  return candidate.uriTemplate?.toString() ?? "";
}

async function readResource(
  server: FakeServer,
  name: string,
  uri: string,
  variables: Record<string, string>,
): Promise<ReadResourceResult> {
  const resource = server.resources.get(name);
  if (resource === undefined) throw new Error(`missing resource: ${name}`);
  return resource.handler(new URL(uri), variables, {});
}

describe("mcp knowledge resources", () => {
  it("registers the knowledge file and event resource templates", () => {
    const server = registerResources();
    expect(CURATED_RESOURCE_NAMES).toEqual(
      expect.arrayContaining(["pumble_knowledge_file", "pumble_event"]),
    );
    expect(templateUri(server.resources.get("pumble_knowledge_file")?.template))
      .toBe("pumble://knowledge/{+path}");
    expect(templateUri(server.resources.get("pumble_event")?.template))
      .toBe("pumble://events/{name}");
  });

  it("reads a native knowledge file as text/markdown", async () => {
    const server = registerResources();
    const result = await readResource(
      server,
      "pumble_knowledge_file",
      "pumble://knowledge/native/glossary.md",
      { path: "native/glossary.md" },
    );
    expect(result.contents).toHaveLength(1);
    const [content] = result.contents;
    expect(content?.mimeType).toBe("text/markdown");
    const text = "text" in (content ?? {}) ? content.text : "";
    expect(text).toMatch(/^# /m);
    expect(text).toContain("API key");
  });

  it("reads an upstream typescript file as text/x-typescript", async () => {
    const server = registerResources();
    const result = await readResource(
      server,
      "pumble_knowledge_file",
      "pumble://knowledge/upstream/blocks/types.ts",
      { path: "upstream/blocks/types.ts" },
    );
    const [content] = result.contents;
    expect(content?.mimeType).toBe("text/x-typescript");
    const text = "text" in (content ?? {}) ? content.text : "";
    expect(text).toContain("@derived-from CAKE-com/pumble-node-sdk");
  });

  it("rejects path traversal", async () => {
    const server = registerResources();
    await expect(readResource(
      server,
      "pumble_knowledge_file",
      "pumble://knowledge/../package.json",
      { path: "../package.json" },
    )).rejects.toThrow(/path-traversal|refused/i);
  });

  it("rejects unknown knowledge paths", async () => {
    const server = registerResources();
    await expect(readResource(
      server,
      "pumble_knowledge_file",
      "pumble://knowledge/native/does-not-exist.md",
      { path: "native/does-not-exist.md" },
    )).rejects.toThrow(/unknown|not found/i);
  });

  it("reads an event resource that wraps the upstream payload", async () => {
    const server = registerResources();
    const result = await readResource(
      server,
      "pumble_event",
      "pumble://events/Message",
      { name: "Message" },
    );
    const [content] = result.contents;
    expect(content?.mimeType).toBe("text/markdown");
    const text = "text" in (content ?? {}) ? content.text : "";
    expect(text).toContain("NotificationMessage");
    expect(text).toContain("CAKE-com/pumble-node-sdk");
  });

  it("rejects unknown event names", async () => {
    const server = registerResources();
    await expect(readResource(
      server,
      "pumble_event",
      "pumble://events/NotARealEvent",
      { name: "NotARealEvent" },
    )).rejects.toThrow(/unknown event/i);
  });

  it("does not require an API client to read knowledge", async () => {
    const server = new FakeServer();
    registerCuratedResources(server as never, undefined as never);
    const result = await readResource(
      server,
      "pumble_knowledge_file",
      "pumble://knowledge/native/api-shape.md",
      { path: "native/api-shape.md" },
    );
    const [content] = result.contents;
    const text = "text" in (content ?? {}) ? content.text : "";
    expect(text).toContain("Pumble API-Keys");
  });
});
