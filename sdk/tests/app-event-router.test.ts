import { describe, expect, it, vi } from "vitest";
import {
  createPumbleEventRouter,
  type PumbleWebhookEvent,
} from "../src/extensions/index.js";

const newMessageEvent: PumbleWebhookEvent<"NEW_MESSAGE"> = {
  type: "NEW_MESSAGE",
  body: {
    ty: "NEW_MESSAGE",
    wId: "aaaaaaaaaaaaaaaaaaaa0000",
    cId: "bbbbbbbbbbbbbbbbbbbb0001",
    mId: "cccccccccccccccccccc0001",
    aId: "aaaaaaaaaaaaaaaaaaaa0001",
    tx: "hello",
  },
  workspaceId: "aaaaaaaaaaaaaaaaaaaa0000",
  raw: { ty: "NEW_MESSAGE" },
};

describe("createPumbleEventRouter", () => {
  it("runs matching handlers sequentially by registration order", async () => {
    const router = createPumbleEventRouter<{ requestId: string }>();
    const calls: string[] = [];
    const context = { requestId: "req-1" };

    const chained = router
      .on("NEW_MESSAGE", async (event, seenContext) => {
        await Promise.resolve();
        calls.push(`${event.body.tx}:${seenContext.requestId}:first`);
      })
      .on("REACTION_ADDED", () => {
        calls.push("wrong event");
      })
      .on("NEW_MESSAGE", () => {
        calls.push(`second-after-${calls.length}`);
      });

    expect(chained).toBe(router);
    await expect(router.dispatch(newMessageEvent, context)).resolves.toEqual({ handled: 2 });
    expect(calls).toEqual(["hello:req-1:first", "second-after-1"]);
  });

  it("returns zero when no handler is registered for the event type", async () => {
    const router = createPumbleEventRouter();

    await expect(router.dispatch(newMessageEvent, {})).resolves.toEqual({ handled: 0 });
  });

  it("rejects with an error that names the event type when a handler throws", async () => {
    const afterThrow = vi.fn();
    const router = createPumbleEventRouter()
      .on("NEW_MESSAGE", () => {
        throw new Error("boom");
      })
      .on("NEW_MESSAGE", afterThrow);

    await expect(router.dispatch(newMessageEvent, {})).rejects.toThrow(/NEW_MESSAGE/);
    expect(afterThrow).not.toHaveBeenCalled();
  });
});
