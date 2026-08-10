// Live integration test for the hand-rolled searchAllMessages helper.
//
// Skip-by-default so vitest runs as part of regular CI don't require the
// secret API key; explicitly opt in by sourcing /tmp/pumble-livetest.env,
// or run with PUMBLE_REPLAY preloaded. Set
// RUN_LIVE_SEARCH_TEST=0 to force-skip even when the env is present.

import { describe, expect, it } from "vitest";
import { PumbleSDK } from "../src/sdk/sdk.js";
import { searchAllMessages } from "../src/extensions/search-all.js";

const apiKey = process.env["PUMBLE_API_KEY"];
const forceSkip = process.env["RUN_LIVE_SEARCH_TEST"] === "0";
const liveEnabled = (!!apiKey || !!process.env["PUMBLE_REPLAY"]) && !forceSkip;

const live = liveEnabled ? describe : describe.skip;

live("searchAllMessages — live workspace", () => {
  const sdk = new PumbleSDK({ apiKeyAuth: apiKey ?? "replay-api-key" });

  it("yields hits with no duplicates", async () => {
    // Pick a generic search term likely to match many messages in the
    // sacrificial workspace (smoke-test seeds messages with this text).
    const yielded: string[] = [];
    for await (const hit of searchAllMessages(sdk, { text: "the", limit: 5 })) {
      yielded.push(hit.id);
      if (yielded.length >= 30) break; // cap to keep test fast
    }
    const unique = new Set(yielded);
    expect(unique.size).toBe(yielded.length);
  }, 60_000);

  it("walks more than one page when totalElements exceeds the page limit", async () => {
    // Drive the helper with a tiny limit so multiple pages are needed
    // for any non-trivial result set.
    const limit = 2;
    let pagesObserved = 0;
    let yielded = 0;

    // Wrap the SDK so we can count how many underlying API calls happen.
    const counting = {
      messages: {
        async searchMessages(req: Parameters<typeof sdk.messages.searchMessages>[0]) {
          pagesObserved++;
          return sdk.messages.searchMessages(req);
        },
      },
    };

    // Probe the first page to see whether the workspace actually has
    // enough hits to span pages with `limit=2`. If not, skip the
    // multi-page assertion (still useful as a smoke that the helper
    // doesn't crash).
    const firstPage = await sdk.messages.searchMessages({ text: "the", limit });
    const total = firstPage.result.totalElements ?? 0;

    for await (const hit of searchAllMessages(counting, { text: "the", limit })) {
      yielded++;
      void hit;
      if (yielded >= 6) break;
    }

    if (process.env["PUMBLE_REPLAY"]) {
      // Replay fixtures are deterministic: 6 hits at 2 per page.
      expect(pagesObserved).toBe(3);
    } else if (total > limit) {
      expect(pagesObserved).toBeGreaterThan(1);
    } else {
      // Workspace too small — just confirm the helper terminated cleanly.
      expect(pagesObserved).toBeGreaterThanOrEqual(1);
    }
  }, 60_000);
});

// Always run: a pure-unit test against a mocked client. Verifies the
// dedupe + cursor-step + stop-on-loop logic without needing live creds.
describe("searchAllMessages — mocked", () => {
  it("dedupes by id across overlapping pages", async () => {
    let call = 0;
    const mock = {
      messages: {
        async searchMessages() {
          call++;
          if (call === 1) {
            return {
              result: {
                content: [
                  { id: "m1", timestampMilli: 3000 } as any,
                  { id: "m2", timestampMilli: 2000 } as any,
                ],
                totalElements: 3,
                hasMore: true,
              },
            };
          }
          if (call === 2) {
            // Server returned an overlapping page (m2 again) plus a new id.
            return {
              result: {
                content: [
                  { id: "m2", timestampMilli: 2000 } as any,
                  { id: "m3", timestampMilli: 1000 } as any,
                ],
                totalElements: 3,
                hasMore: false,
              },
            };
          }
          return { result: { content: [], totalElements: 3, hasMore: false } };
        },
      },
    };

    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 2 })) {
      got.push(hit.id);
    }
    expect(got).toEqual(["m1", "m2", "m3"]);
  });

  it("overlaps same-second boundaries so unseen IDs are not skipped", async () => {
    const calls: Array<number | undefined> = [];
    const mock = {
      messages: {
        async searchMessages(req: { beforeTs?: number }) {
          calls.push(req.beforeTs);
          if (calls.length === 1) {
            return {
              result: {
                content: [
                  { id: "a", timestampMilli: 7000 } as any,
                  { id: "b", timestampMilli: 5000 } as any,
                  { id: "c", timestampMilli: 5000 } as any,
                ],
                totalElements: 5,
                hasMore: true,
              },
            };
          }
          if (req.beforeTs === 6000 && calls.filter((value) => value === 6000).length === 1) {
            return {
              result: {
                content: [
                  { id: "b", timestampMilli: 5000 } as any,
                  { id: "c", timestampMilli: 5000 } as any,
                  { id: "d", timestampMilli: 5000 } as any,
                ],
                totalElements: 5,
                hasMore: true,
              },
            };
          }
          if (req.beforeTs === 6000) {
            return {
              result: {
                content: [
                  { id: "b", timestampMilli: 5000 } as any,
                  { id: "c", timestampMilli: 5000 } as any,
                  { id: "d", timestampMilli: 5000 } as any,
                ],
                totalElements: 5,
                hasMore: true,
              },
            };
          }
          if (req.beforeTs === 4999) {
            return {
              result: {
                content: [
                  { id: "e", timestampMilli: 4000 } as any,
                ],
                totalElements: 5,
                hasMore: false,
              },
            };
          }
          return { result: { content: [], totalElements: 5, hasMore: false } };
        },
      },
    };

    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 3 })) {
      got.push(hit.id);
    }

    expect(got).toEqual(["a", "b", "c", "d", "e"]);
    expect(calls).toEqual([undefined, 6000, 6000, 4999]);
  });

  it("dedupes already-seen IDs from overlap pages", async () => {
    let call = 0;
    const mock = {
      messages: {
        async searchMessages() {
          call++;
          return {
            result: {
              content: [
                { id: "b", timestampMilli: 5000 } as any,
                { id: "c", timestampMilli: 5000 } as any,
              ],
              totalElements: 2,
              hasMore: call === 1,
            },
          };
        },
      },
    };

    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 2 })) {
      got.push(hit.id);
    }

    expect(got).toEqual(["b", "c"]);
    expect(call).toBe(3);
  });

  it("stops overlap after a page with no new IDs", async () => {
    const calls: Array<number | undefined> = [];
    const mock = {
      messages: {
        async searchMessages(req: { beforeTs?: number }) {
          calls.push(req.beforeTs);
          if (calls.length === 1) {
            return {
              result: {
                content: [
                  { id: "a", timestampMilli: 5000 } as any,
                  { id: "b", timestampMilli: 5000 } as any,
                ],
                totalElements: 2,
                hasMore: true,
              },
            };
          }
          return {
            result: {
              content: [
                { id: "a", timestampMilli: 5000 } as any,
                { id: "b", timestampMilli: 5000 } as any,
              ],
              totalElements: 2,
              hasMore: false,
            },
          };
        },
      },
    };

    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 2 })) {
      got.push(hit.id);
    }

    expect(got).toEqual(["a", "b"]);
    expect(calls.filter((cursor) => cursor === 6000)).toHaveLength(1);
  });

  it("counts overlap requests against the page cap", async () => {
    const mock = {
      messages: {
        async searchMessages() {
          return {
            result: {
              content: [
                { id: "a", timestampMilli: 5000 } as any,
                { id: "b", timestampMilli: 5000 } as any,
              ],
              totalElements: 4,
              hasMore: true,
            },
          };
        },
      },
    };

    await expect(async () => {
      for await (const _hit of searchAllMessages(mock, { text: "x", limit: 2 }, { maxPages: 1 })) {
        // consume
      }
    }).rejects.toThrow(/exceeded 1 pages/);
  });

  it("stops when the server returns the same first id twice", async () => {
    let call = 0;
    const mock = {
      messages: {
        async searchMessages() {
          call++;
          // Always return the same page — simulates a misbehaving server.
          return {
            result: {
              content: [
                { id: "loop1", timestampMilli: 5000 } as any,
                { id: "loop2", timestampMilli: 4000 } as any,
              ],
              totalElements: 99,
              hasMore: true,
            },
          };
        },
      },
    };

    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 2 })) {
      got.push(hit.id);
      if (got.length > 10) throw new Error("helper failed to break server loop");
    }
    // First page yields both, then loop-detection bails on the next page.
    expect(got).toEqual(["loop1", "loop2"]);
    expect(call).toBe(2);
  });

  it("terminates on empty page", async () => {
    const mock = {
      messages: {
        async searchMessages() {
          return { result: { content: [], totalElements: 0, hasMore: false } };
        },
      },
    };
    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x" })) {
      got.push(hit.id);
    }
    expect(got).toEqual([]);
  });

  it("honors maxResults — stops yielding past the cap", async () => {
    // Server has 5 pages × 2 items = 10 distinct messages. Cap at 3.
    let call = 0;
    const mock = {
      messages: {
        async searchMessages() {
          call++;
          if (call > 5) return { result: { content: [], totalElements: 10, hasMore: false } };
          return {
            result: {
              content: [
                { id: `m${call * 2 - 1}`, timestampMilli: 10_000 - call * 2 + 1 } as any,
                { id: `m${call * 2}`, timestampMilli: 10_000 - call * 2 } as any,
              ],
              totalElements: 10,
              hasMore: true,
            },
          };
        },
      },
    };

    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 2 }, { maxResults: 3 })) {
      got.push(hit.id);
    }
    expect(got).toEqual(["m1", "m2", "m3"]);
    expect(call).toBe(2); // never had to fetch the 3rd page
  });

  it("propagates AbortSignal mid-walk", async () => {
    const ac = new AbortController();
    const mock = {
      messages: {
        async searchMessages() {
          return {
            result: {
              content: [
                { id: "a", timestampMilli: 100 } as any,
                { id: "b", timestampMilli: 99 } as any,
              ],
              totalElements: 999,
              hasMore: true,
            },
          };
        },
      },
    };

    const got: string[] = [];
    await expect(async () => {
      for await (const hit of searchAllMessages(mock, { text: "x", limit: 2 }, { signal: ac.signal })) {
        got.push(hit.id);
        if (got.length === 1) ac.abort(new Error("user cancel"));
      }
    }).rejects.toThrow("user cancel");
    expect(got).toEqual(["a"]);
  });

  it("tolerates hits missing timestampMilli on the last page", async () => {
    let call = 0;
    const mock = {
      messages: {
        async searchMessages() {
          call++;
          if (call === 1) {
            return {
              result: {
                content: [
                  { id: "x1", timestampMilli: 200 } as any,
                  { id: "x2" } as any, // missing timestamp — defensive
                ],
                totalElements: 2,
                hasMore: false,
              },
            };
          }
          return { result: { content: [], totalElements: 2, hasMore: false } };
        },
      },
    };
    const got: string[] = [];
    for await (const hit of searchAllMessages(mock, { text: "x", limit: 5 })) {
      got.push(hit.id);
    }
    // Both ids are yielded; helper doesn't crash; iteration stops on hasMore=false+short-page.
    expect(got).toEqual(["x1", "x2"]);
  });

  it("invokes onPage with per-page info", async () => {
    let call = 0;
    const mock = {
      messages: {
        async searchMessages() {
          call++;
          if (call === 1) {
            return {
              result: {
                content: [
                  { id: "p1", timestampMilli: 500 } as any,
                  { id: "p2", timestampMilli: 400 } as any,
                ],
                totalElements: 3,
                hasMore: true,
              },
            };
          }
          return {
            result: {
              content: [
                { id: "p3", timestampMilli: 300 } as any,
              ],
              totalElements: 3,
              hasMore: false,
            },
          };
        },
      },
    };

    const pageReports: Array<{ pageIndex: number; newInPage: number; yielded: number }> = [];
    const got: string[] = [];
    for await (const hit of searchAllMessages(
      mock,
      { text: "x", limit: 2 },
      {
        onPage: (_, info) => {
          pageReports.push(info);
        },
      },
    )) {
      got.push(hit.id);
    }
    expect(got).toEqual(["p1", "p2", "p3"]);
    expect(pageReports).toEqual([
      { pageIndex: 1, newInPage: 2, yielded: 0 },
      { pageIndex: 2, newInPage: 1, yielded: 2 },
    ]);
  });

  it("enforces maxPages safety cap", async () => {
    // Adversarial mock: every call returns a fresh unique id with a
    // monotonically decreasing timestamp so neither dedupe nor the
    // cursor-non-progress guard fires. Only the maxPages cap stops it.
    let nextId = 0;
    let ts = 10_000_000;
    const mock = {
      messages: {
        async searchMessages() {
          ts -= 1000;
          nextId++;
          return {
            result: {
              content: [
                { id: `n${nextId}`, timestampMilli: ts } as any,
              ],
              totalElements: 999,
              hasMore: true,
            },
          };
        },
      },
    };
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of searchAllMessages(mock, { text: "x" }, { maxPages: 3 })) {
        // consume
      }
    }).rejects.toThrow(/exceeded 3 pages/);
  });
});

import { createPumbleClient } from "../src/extensions/client.js";

describe("facade search.all", () => {
  it("is exposed on the facade", () => {
    const client = createPumbleClient({
      apiKeyAuth: "x".repeat(24),
      serverURL: "https://example.invalid",
    });
    expect(typeof client.search?.all).toBe("function");
  });
});

