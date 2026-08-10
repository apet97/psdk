import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    pool: "forks",
    coverage: {
      // V8 provider keeps the additional devDep footprint minimal.
      //
      // We gate only on the HANDWRITTEN tree: src/extensions/** (façade,
      // resolvers, webhooks, retries, telemetry, branded ids, app
      // helpers, testing helpers) and src/mcp-server/curated/** (the
      // curated MCP tool/resource/prompt registrations). Generated code
      // (src/funcs, src/sdk, src/models, src/lib, src/hooks, src/types,
      // src/index.ts, src/core.ts, src/mcp-server/tools) is intentionally
      // excluded - Speakeasy unit-tests its emitted code, and this repo
      // exercises the generated layer at the integration/replay level
      // via the arazzo runner. Counting unhit generated branches against
      // the gate produces a noisy threshold that does not reflect the
      // quality of the handwritten layer the gate is meant to protect.
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/extensions/**/*.{ts,tsx}",
        "src/mcp-server/curated/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/extensions/index.ts",
        "src/mcp-server/curated/index.ts",
      ],
      // Thresholds borrowed (loosely) from anon's pattern - set slightly
      // below the measured baseline so the current suite passes but a
      // regression below the floor fails CI. Bump these only when the
      // measured coverage rises and you want to lock in the new floor.
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
