/// <reference types="bun-types" />

import { build } from "bun";

const common = {
  outdir: "./bin",
  sourcemap: "linked",
  target: "node",
  format: "esm",
  minify: false,
  throw: true,
  banner: "#!/usr/bin/env node",
} as const;

await build({
  ...common,
  entrypoints: ["./src/mcp-server/mcp-server.ts"],
});

await build({
  ...common,
  entrypoints: ["./src/mcp-server/curated/cli.ts"],
  naming: "pumble-mcp-curated.[ext]",
});
