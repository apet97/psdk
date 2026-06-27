# Pumble MCP server — containerised pumble-keys-mcp wrapper.
#
# Build:
#   docker build -t pumble-keys-mcp:latest .
#
# Run (stdio MCP, all 26 tools):
#   docker run --rm -i -e PUMBLE_API_KEY pumble-keys-mcp:latest \
#     start --transport stdio
#
# Run (read-only profile):
#   docker run --rm -i -e PUMBLE_API_KEY pumble-keys-mcp:latest \
#     start --transport stdio --profile readonly
#
# Run (dry-run — agent calls all 26 tools, mutations intercepted):
#   docker run --rm -i -e PUMBLE_API_KEY pumble-keys-mcp:latest \
#     start --transport stdio --dry-run
#
# For Claude Desktop, point claude_desktop_config.json's `command` at
# `docker` and stream stdio through. Example in QUICKSTART.md.

# ── Stage 1: build ──────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /build

# Copy lockfile + manifest first so deps cache survives source edits.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Source + build inputs.
COPY tsconfig.json oxlintrc.json* .oxlintrc.json* ./
COPY src ./src
COPY bin ./bin
COPY scripts/normalize-package.mjs ./scripts/normalize-package.mjs

RUN npm run build

# Strip dev dependencies for the runtime stage.
RUN npm prune --omit=dev


# ── Stage 2: runtime ────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Run as non-root by default. The official node image already creates
# a `node` user (uid 1000) which is what we use.
USER node

# Copy only the artifacts the wrapper needs to run.
COPY --chown=node:node --from=build /build/package.json ./package.json
COPY --chown=node:node --from=build /build/node_modules ./node_modules
COPY --chown=node:node --from=build /build/esm ./esm
COPY --chown=node:node --from=build /build/bin ./bin

# The wrapper is the canonical entrypoint; users append their own
# `start --transport ...` args.
ENTRYPOINT ["node", "/app/bin/pumble-keys-mcp.mjs"]
CMD ["--help"]

# Image metadata for registry consumers.
LABEL org.opencontainers.image.title="pumble-keys-mcp"
LABEL org.opencontainers.image.description="MCP server for the Pumble API-Keys add-on, with --profile and --dry-run wrappers."
LABEL org.opencontainers.image.licenses="MIT"
