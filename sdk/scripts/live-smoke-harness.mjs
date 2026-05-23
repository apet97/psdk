import { redactLiveValue, runLiveOperation } from "./live-smoke-utils.mjs";

export function redactedSummaryPayload(summary, ids = {}) {
  return {
    ok: true,
    summary,
    ids: redactLiveValue(ids),
  };
}

export function printRedactedJson(payload) {
  console.log(JSON.stringify(redactLiveValue(payload)));
}

export function createLiveSmokeHarness({ finalSummary }) {
  const trackedCleanup = [];

  return {
    run: runLiveOperation,
    trackCleanup(item) {
      trackedCleanup.push(item);
    },
    trackMessage(message) {
      this.trackCleanup(message);
    },
    async cleanup(cleanupMessage) {
      for (const item of [...trackedCleanup].reverse()) {
        try {
          await cleanupMessage(item);
        } catch {
          // Best-effort cleanup only: live smoke should report the original failure.
        }
      }
    },
    successPayload(ids = {}) {
      return redactedSummaryPayload(finalSummary, ids);
    },
    printSuccess(ids = {}) {
      printRedactedJson(this.successPayload(ids));
    },
  };
}
