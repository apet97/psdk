import { redactLiveValue, runLiveOperation } from "./live-smoke-utils.mjs";

export function createLiveSmokeHarness({ finalSummary }) {
  const trackedMessages = [];

  return {
    run: runLiveOperation,
    trackMessage(message) {
      trackedMessages.push(message);
    },
    async cleanup(cleanupMessage) {
      for (const item of [...trackedMessages].reverse()) {
        try {
          await cleanupMessage(item);
        } catch {
          // Best-effort cleanup only: live smoke should report the original failure.
        }
      }
    },
    successPayload(ids = {}) {
      return {
        ok: true,
        summary: finalSummary,
        ids: redactLiveValue(ids),
      };
    },
    printSuccess(ids = {}) {
      console.log(JSON.stringify(this.successPayload(ids)));
    },
  };
}
