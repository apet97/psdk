import { describe, expect, it, vi } from "vitest";
import {
  createPumbleEventRouter,
  type PumbleWebhookEvent,
} from "../src/extensions/index.js";
import {
  PUMBLE_SOCKET_MODE_PROTOCOL_EVIDENCE,
  createPumbleSocketModeReceiver,
  type PumbleSocketModeSocket,
} from "../src/extensions/app/socket-mode.js";

const newMessageBody = {
  ty: "NEW_MESSAGE",
  wId: "aaaaaaaaaaaaaaaaaaaa0000",
  cId: "bbbbbbbbbbbbbbbbbbbb0001",
  mId: "cccccccccccccccccccc0001",
  aId: "aaaaaaaaaaaaaaaaaaaa0001",
  tx: "hello over socket mode",
};

class FakeSocket implements PumbleSocketModeSocket {
  readonly sent: string[] = [];
  closed = false;
  #listeners = new Map<string, Array<(data?: unknown) => void | Promise<void>>>();

  on(event: string, listener: (data?: unknown) => void | Promise<void>): this {
    this.#listeners.set(event, [...(this.#listeners.get(event) ?? []), listener]);
    return this;
  }

  send(data: string | Uint8Array): void {
    this.sent.push(typeof data === "string" ? data : Buffer.from(data).toString("utf8"));
  }

  close(): void {
    this.closed = true;
  }

  removeAllListeners(): void {
    this.#listeners.clear();
  }

  async emit(event: string, data?: unknown): Promise<void> {
    for (const listener of this.#listeners.get(event) ?? []) {
      await listener(data);
    }
  }
}

describe("createPumbleSocketModeReceiver", () => {
  it("connects through an injected socket and dispatches verified PUMBLE_EVENT frames", async () => {
    const socket = new FakeSocket();
    const onNewMessage = vi.fn();
    const router = createPumbleEventRouter<{ source: "socket-mode" }>()
      .on("NEW_MESSAGE", onNewMessage);
    const receiver = createPumbleSocketModeReceiver({
      getWebSocketUrl: async () => "wss://example.pumble.test/socket",
      createSocket: (url) => {
        expect(url).toBe("wss://example.pumble.test/socket");
        return socket;
      },
      router,
      context: { source: "socket-mode" },
    });

    await receiver.connect();
    await socket.emit("message", JSON.stringify({
      correlation_id: "correlation-1",
      payload: {
        messageType: "PUMBLE_EVENT",
        eventType: "NEW_MESSAGE",
        workspaceId: newMessageBody.wId,
        workspaceUserIds: ["aaaaaaaaaaaaaaaaaaaa0002"],
        body: JSON.stringify(newMessageBody),
      },
    }));

    expect(onNewMessage).toHaveBeenCalledWith({
      type: "NEW_MESSAGE",
      body: newMessageBody,
      workspaceId: newMessageBody.wId,
      workspaceUserIds: ["aaaaaaaaaaaaaaaaaaaa0002"],
      raw: {
        messageType: "PUMBLE_EVENT",
        eventType: "NEW_MESSAGE",
        workspaceId: newMessageBody.wId,
        workspaceUserIds: ["aaaaaaaaaaaaaaaaaaaa0002"],
        body: JSON.stringify(newMessageBody),
      },
    } satisfies PumbleWebhookEvent<"NEW_MESSAGE">, { source: "socket-mode" });
    expect(socket.sent).toEqual([]);

    await receiver.disconnect();

    expect(socket.closed).toBe(true);
  });

  it("fails closed when no WebSocket transport is injected", async () => {
    const receiver = createPumbleSocketModeReceiver({
      getWebSocketUrl: async () => "wss://example.pumble.test/socket",
      router: createPumbleEventRouter(),
    });

    await expect(receiver.connect()).rejects.toThrow(/WebSocket transport is not bundled/i);
  });

  it("records the official source used for the implemented protocol subset", () => {
    expect(PUMBLE_SOCKET_MODE_PROTOCOL_EVIDENCE.source).toContain("CAKE-com/pumble-node-sdk");
    expect(PUMBLE_SOCKET_MODE_PROTOCOL_EVIDENCE.verifiedBehavior).toContain("correlation_id");
  });
});
