export const READONLY_TOOLS = [
  "channels-list-channels",
  "channels-get-channel",
  "messages-search-messages",
  "messages-list-messages",
  "messages-fetch-message",
  "messages-fetch-thread-replies",
  "scheduled-messages-fetch-scheduled-messages",
  "scheduled-messages-fetch-scheduled-message",
  "users-list-users",
  "users-list-user-groups",
  "users-my-info",
];

export const READWRITE_TOOLS = [
  ...READONLY_TOOLS,
  "channels-create-channel",
  "channels-add-users-to-channel",
  "channels-remove-user-from-channel",
  "messages-send-message",
  "messages-send-reply",
  "messages-dm-user",
  "messages-dm-group",
  "messages-edit-message",
  "messages-delete-message",
  "messages-add-reaction",
  "messages-remove-reaction",
  "scheduled-messages-create-scheduled-message",
  "scheduled-messages-edit-scheduled-message",
  "scheduled-messages-delete-scheduled-message",
  "users-custom-status",
];

export const CURATED_TOOLS = [
  "whoami",
  "find_channel",
  "find_user",
  "list_channels",
  "search_messages",
  "get_channel_context",
  "get_thread_context",
  "send_message_preview",
  "send_message_confirmed",
  "reply_to_thread_preview",
  "reply_to_thread_confirmed",
];

export class WrapperUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "WrapperUsageError";
    this.exitCode = 2;
  }
}

export function parseWrapperArgs(argv) {
  const args = [...argv];
  let profile = null;
  let dryRun = false;
  let auditLog = null;
  let allowRawWrites = false;
  let help = false;
  const passthrough = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--profile") {
      profile = args[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("--profile=")) {
      profile = a.slice("--profile=".length);
      continue;
    }
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a === "--allow-raw-writes") {
      allowRawWrites = true;
      continue;
    }
    if (a === "--audit-log") {
      auditLog = args[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("--audit-log=")) {
      auditLog = a.slice("--audit-log=".length);
      continue;
    }
    if (a === "--help" || a === "-h") {
      help = true;
      continue;
    }
    passthrough.push(a);
  }
  return { profile, dryRun, auditLog, allowRawWrites, help, passthrough };
}

function hasApiKeyAuth(args) {
  return args.some((arg) => arg === "--api-key-auth" || arg.startsWith("--api-key-auth="));
}

function envApiKey(env) {
  return env.PUMBLE_API_KEY ?? env.PUMBLESDK_API_KEY_AUTH ?? null;
}

/**
 * @param {{
 *   argv: string[],
 *   env: Record<string, string | undefined>,
 *   generatedMcp?: string,
 *   curatedMcp?: string,
 *   dryRunShimUrl?: string,
 *   auditLogShimUrl?: string,
 * }} options
 */
export function buildMcpInvocation({ argv, env, generatedMcp, curatedMcp, dryRunShimUrl, auditLogShimUrl }) {
  const parsed = parseWrapperArgs(argv);
  if (parsed.help) {
    return {
      ...parsed,
      effectiveProfile: null,
      args: /** @type {string[]} */ ([]),
      nodeArgs: /** @type {string[]} */ ([]),
      childEnv: { ...env },
      tools: /** @type {string[]} */ ([]),
    };
  }
  if (parsed.dryRun && parsed.profile === "readonly") {
    throw new WrapperUsageError("pumble-keys-mcp: --dry-run and --profile readonly are mutually exclusive — pick one.");
  }
  if (parsed.auditLog !== null && (typeof parsed.auditLog !== "string" || parsed.auditLog.length === 0)) {
    throw new WrapperUsageError("pumble-keys-mcp: --audit-log requires a non-empty path argument.");
  }

  const callerSuppliedTool = parsed.passthrough.some((a) => a === "--tool" || a.startsWith("--tool="));
  const effectiveProfile = parsed.profile ?? (parsed.dryRun || callerSuppliedTool ? "readwrite" : "curated");
  if (effectiveProfile !== "readonly" && effectiveProfile !== "readwrite" && effectiveProfile !== "curated") {
    throw new WrapperUsageError(`pumble-keys-mcp: --profile must be 'readonly', 'readwrite', or 'curated', got: ${effectiveProfile}`);
  }
  if (effectiveProfile === "readonly" && callerSuppliedTool) {
    throw new WrapperUsageError(
      "pumble-keys-mcp: --profile readonly and --tool are mutually exclusive — a caller-supplied tool would bypass the readonly whitelist.",
    );
  }
  const exposesRawWrites = effectiveProfile === "readwrite" && !parsed.dryRun;
  if (exposesRawWrites && !parsed.allowRawWrites) {
    throw new WrapperUsageError(
      "pumble-keys-mcp: --profile readwrite exposes raw mutating tools; pass --allow-raw-writes and --audit-log <path> to acknowledge.",
    );
  }
  if (exposesRawWrites && !parsed.auditLog) {
    throw new WrapperUsageError(
      "pumble-keys-mcp: raw readwrite mode requires --audit-log <path>.",
    );
  }

  const usesCuratedServer = effectiveProfile === "curated";
  const tools = usesCuratedServer ? [] : effectiveProfile === "readonly" ? READONLY_TOOLS : READWRITE_TOOLS;
  const args = [...parsed.passthrough];
  if (!hasApiKeyAuth(args)) {
    const apiKey = envApiKey(env);
    if (apiKey) args.push("--api-key-auth", apiKey);
  }
  if (!usesCuratedServer && !callerSuppliedTool) {
    for (const tool of tools) args.push("--tool", tool);
  }

  const nodeArgs = [];
  const childEnv = { ...env };
  if (parsed.dryRun) {
    nodeArgs.push("--import", dryRunShimUrl);
    childEnv.PUMBLE_DRY_RUN = "1";
    if (parsed.auditLog) childEnv.PUMBLE_DRY_RUN_LOG = parsed.auditLog;
  } else if (parsed.auditLog) {
    nodeArgs.push("--import", auditLogShimUrl);
    childEnv.PUMBLE_AUDIT_LOG = parsed.auditLog;
  }
  const serverEntrypoint = usesCuratedServer ? curatedMcp : generatedMcp;
  if (serverEntrypoint) nodeArgs.push(serverEntrypoint, ...args);

  return {
    ...parsed,
    effectiveProfile,
    tools,
    args,
    nodeArgs,
    childEnv,
  };
}
