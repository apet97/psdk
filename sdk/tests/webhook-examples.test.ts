import { describe, expect, it } from "vitest";

describe("webhook examples compile", () => {
  it("express example exports a router-style factory", async () => {
    const mod = await import("../examples/webhooks/express.js");
    expect(typeof mod.makeRouter).toBe("function");
  });

  it("fastify example exports a plugin factory", async () => {
    const mod = await import("../examples/webhooks/fastify.js");
    expect(typeof mod.fastifyPumbleWebhook).toBe("function");
  });

  it("next-route exports POST handler", async () => {
    const mod = await import("../examples/webhooks/next-route.js");
    expect(typeof mod.POST).toBe("function");
  });

  it("node-http exports a request handler", async () => {
    const mod = await import("../examples/webhooks/node-http.js");
    expect(typeof mod.handler).toBe("function");
  });
});
