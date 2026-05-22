import { beforeEach, describe, expect, it, vi } from "vitest";

const delegates = vi.hoisted(() => ({
  findChannelByName: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock("../src/extensions/find.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/extensions/find.js")>();
  return {
    ...actual,
    findChannelByName: delegates.findChannelByName,
    findUserByEmail: delegates.findUserByEmail,
  };
});

import { createPumbleClient } from "../src/extensions/index.js";

describe("createPumbleClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the generated client as raw", () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });

    expect(client.raw).toBeDefined();
    expect(client.raw.users).toBeDefined();
  });

  it("delegates identity.me to generated users.myInfo", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const user = { id: "u1", email: "me@example.invalid", name: "Me" };
    const myInfo = vi.spyOn(client.raw.users, "myInfo").mockResolvedValue(user as any);

    await expect(client.identity.me()).resolves.toBe(user);
    expect(myInfo).toHaveBeenCalledOnce();
  });

  it("delegates channels.findByName through findChannelByName", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const channel = { id: "c1", name: "general" };
    delegates.findChannelByName.mockResolvedValue(channel);

    await expect(client.channels.findByName("general")).resolves.toBe(channel);
    expect(delegates.findChannelByName).toHaveBeenCalledWith(
      client.raw,
      "general",
      undefined,
    );
  });

  it("delegates users.findByEmail through findUserByEmail", async () => {
    const client = createPumbleClient({ apiKeyAuth: "x" });
    const user = { id: "u1", email: "u@example.invalid" };
    delegates.findUserByEmail.mockResolvedValue(user);

    await expect(client.users.findByEmail("u@example.invalid")).resolves.toBe(user);
    expect(delegates.findUserByEmail).toHaveBeenCalledWith(
      client.raw,
      "u@example.invalid",
      undefined,
    );
  });
});
