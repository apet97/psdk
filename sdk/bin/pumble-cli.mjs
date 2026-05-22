#!/usr/bin/env node
// First-class one-shot CLI for the generated Pumble SDK.
//
// Hand-written and regen-safe: this file lives in sdk/bin/ and is wired
// through sdk/.speakeasy/gen.yaml additionalPackageJSON.bin.

import { parseArgs } from "node:util";
import { PumbleSDK } from "../esm/index.js";
import { findChannelByName, findUserByEmail } from "../esm/extensions/find.js";

const ID_RE = /^[a-f0-9]{24}$/i;
const DEFAULT_BASE_URL = "https://pumble-api-keys.addons.marketplace.cake.com";

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliError";
  }
}

async function main(argv) {
  const { globals, args } = parseGlobalOptions(argv);
  if (globals.help || args.length === 0) {
    printHelp();
    return;
  }

  const sdk = createClient(globals);
  const [command, ...rest] = args;

  switch (command) {
    case "whoami":
      return cmdWhoami(sdk, rest);
    case "channels":
      return cmdChannels(sdk, rest, globals);
    case "send":
      return cmdSend(sdk, rest, globals);
    case "dm":
      return cmdDm(sdk, rest, globals);
    case "search":
      return cmdSearch(sdk, rest);
    case "messages":
      return cmdMessages(sdk, rest);
    case "status":
      return cmdStatus(sdk, rest, globals);
    case "schedule":
      return cmdSchedule(sdk, rest, globals);
    case "help":
      printHelp();
      return;
    default:
      throw new UsageError(`unknown command: ${command}`);
  }
}

function parseGlobalOptions(argv) {
  const globals = {
    apiKey: process.env.PUMBLE_API_KEY ?? process.env.PUMBLESDK_API_KEY_AUTH ?? null,
    baseURL: process.env.PUMBLE_BASE_URL ?? process.env.PUMBLESDK_SERVER_URL ?? DEFAULT_BASE_URL,
    timeoutMs: undefined,
    verbose: false,
    help: false,
  };
  const args = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--api-key-auth" || arg === "--api-key") {
      globals.apiKey = requireValue(argv, ++i, arg);
      continue;
    }
    if (arg.startsWith("--api-key-auth=")) {
      globals.apiKey = arg.slice("--api-key-auth=".length);
      continue;
    }
    if (arg.startsWith("--api-key=")) {
      globals.apiKey = arg.slice("--api-key=".length);
      continue;
    }
    if (arg === "--base-url") {
      globals.baseURL = requireValue(argv, ++i, arg);
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      globals.baseURL = arg.slice("--base-url=".length);
      continue;
    }
    if (arg === "--timeout-ms") {
      globals.timeoutMs = parsePositiveInt(requireValue(argv, ++i, arg), "--timeout-ms");
      continue;
    }
    if (arg.startsWith("--timeout-ms=")) {
      globals.timeoutMs = parsePositiveInt(arg.slice("--timeout-ms=".length), "--timeout-ms");
      continue;
    }
    if (arg === "-v" || arg === "--verbose") {
      globals.verbose = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      globals.help = true;
      continue;
    }
    args.push(arg);
  }

  return { globals, args };
}

function createClient(globals) {
  if (!globals.apiKey) {
    throw new UsageError(
      "missing API key; set PUMBLE_API_KEY or pass --api-key-auth <key>",
    );
  }
  return new PumbleSDK({
    apiKeyAuth: globals.apiKey,
    serverURL: globals.baseURL,
    timeoutMs: globals.timeoutMs,
  });
}

async function cmdWhoami(sdk, args) {
  const parsed = parseCommandArgs(args, {
    json: { type: "boolean", default: false },
  });
  ensureNoPositionals(parsed, "whoami");
  const me = await sdk.users.myInfo();
  if (parsed.values.json) printJson(me);
  else printLine(`${me.name} <${me.email}> (${me.id})`);
}

async function cmdChannels(sdk, args, globals) {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case "list": {
      const parsed = parseCommandArgs(rest, {
        json: { type: "boolean", default: false },
      });
      ensureNoPositionals(parsed, "channels list");
      const entries = await sdk.channels.listChannels();
      if (parsed.values.json) {
        printJson(entries.map((entry) => entry.channel));
      } else {
        for (const entry of entries) printLine(formatChannel(entry.channel));
      }
      return;
    }
    case "create": {
      const parsed = parseCommandArgs(rest, {
        private: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
      });
      const [name, ...extra] = parsed.positionals;
      if (!name || extra.length > 0) {
        throw new UsageError("usage: pumble channels create <name> [--private] [--json]");
      }
      const created = await sdk.channels.createChannel({
        name,
        type: parsed.values.private ? "PRIVATE" : "PUBLIC",
      });
      printMutation(created, parsed.values.json, globals.verbose, (c) =>
        `created #${c.name ?? name} (${c.id})`
      );
      return;
    }
    default:
      throw new UsageError("usage: pumble channels list|create ...");
  }
}

async function cmdSend(sdk, args, globals) {
  const parsed = parseCommandArgs(args, {
    json: { type: "boolean", default: false },
  });
  const [channelArg, ...textParts] = parsed.positionals;
  const text = textParts.join(" ");
  if (!channelArg || !text) {
    throw new UsageError("usage: pumble send <channel> <text> [--json]");
  }
  const channelId = await resolveChannelId(sdk, channelArg);
  const sent = await sdk.messages.sendMessage({ channelId, text });
  printMutation(sent, parsed.values.json, globals.verbose, (m) =>
    `sent ${m.id} in ${m.channelId}`
  );
}

async function cmdDm(sdk, args, globals) {
  const parsed = parseCommandArgs(args, {
    json: { type: "boolean", default: false },
  });
  const [userArg, ...textParts] = parsed.positionals;
  const text = textParts.join(" ");
  if (!userArg || !text) {
    throw new UsageError("usage: pumble dm <user-id-or-email> <text> [--json]");
  }
  const userId = await resolveUserId(sdk, userArg);
  const sent = await sdk.messages.dmUser({ userId, text });
  printMutation(sent, parsed.values.json, globals.verbose, (m) =>
    `sent DM ${m.id} in ${m.channelId}`
  );
}

async function cmdSearch(sdk, args) {
  const parsed = parseCommandArgs(args, {
    limit: { type: "string", default: "10" },
    json: { type: "boolean", default: false },
  });
  const query = parsed.positionals.join(" ");
  if (!query) {
    throw new UsageError("usage: pumble search <query> [--limit N] [--json]");
  }
  const limit = parsePositiveInt(parsed.values.limit, "--limit");
  const page = await sdk.messages.searchMessages({ text: query, limit });
  const hits = (page.result?.content ?? []).slice(0, limit);
  if (parsed.values.json) printJson(hits);
  else hits.forEach((hit) => printLine(formatMessageLike(hit)));
}

async function cmdMessages(sdk, args) {
  const parsed = parseCommandArgs(args, {
    limit: { type: "string", default: "10" },
    json: { type: "boolean", default: false },
  });
  const [channelArg, ...extra] = parsed.positionals;
  if (!channelArg || extra.length > 0) {
    throw new UsageError("usage: pumble messages <channel> [--limit N] [--json]");
  }
  const limit = parsePositiveInt(parsed.values.limit, "--limit");
  const channelId = await resolveChannelId(sdk, channelArg);
  const page = await sdk.messages.listMessages({ channelId, limit });
  const messages = (page.result?.messages ?? []).slice(0, limit);
  if (parsed.values.json) printJson(messages);
  else messages.forEach((message) => printLine(formatMessageLike(message)));
}

async function cmdStatus(sdk, args, globals) {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case "set": {
      const parsed = parseCommandArgs(rest, {
        "expires-at": { type: "string", default: "0" },
        json: { type: "boolean", default: false },
      });
      const [code, ...statusParts] = parsed.positionals;
      const status = statusParts.join(" ");
      if (!code || !status) {
        throw new UsageError(
          "usage: pumble status set <emoji> <text> [--expires-at <ms>] [--json]",
        );
      }
      const result = await sdk.users.customStatus({
        code: normaliseEmojiCode(code),
        status,
        expiresAt: parseNonNegativeInt(parsed.values["expires-at"], "--expires-at"),
      });
      printMutation(result, parsed.values.json, globals.verbose, () => "status updated");
      return;
    }
    case "clear": {
      const parsed = parseCommandArgs(rest, {
        json: { type: "boolean", default: false },
      });
      ensureNoPositionals(parsed, "status clear");
      const result = await sdk.users.customStatus({
        code: ":speech_balloon:",
        status: "",
        expiresAt: Date.now() - 1,
      });
      printMutation(result, parsed.values.json, globals.verbose, () => "status cleared");
      return;
    }
    default:
      throw new UsageError("usage: pumble status set|clear ...");
  }
}

async function cmdSchedule(sdk, args, globals) {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case "list": {
      const parsed = parseCommandArgs(rest, {
        channel: { type: "string" },
        limit: { type: "string", default: "100" },
        json: { type: "boolean", default: false },
      });
      ensureNoPositionals(parsed, "schedule list");
      const limit = parsePositiveInt(parsed.values.limit, "--limit");
      const channelId = parsed.values.channel
        ? await resolveChannelId(sdk, parsed.values.channel)
        : undefined;
      const page = await sdk.scheduledMessages.fetchScheduledMessages({ channelId, limit });
      const scheduled = (page.result?.scheduledMessages ?? []).slice(0, limit);
      if (parsed.values.json) printJson(scheduled);
      else scheduled.forEach((message) => printLine(formatScheduled(message)));
      return;
    }
    case "cancel": {
      const parsed = parseCommandArgs(rest, {
        json: { type: "boolean", default: false },
      });
      const [scheduledMessageId, ...extra] = parsed.positionals;
      if (!scheduledMessageId || extra.length > 0) {
        throw new UsageError("usage: pumble schedule cancel <id> [--json]");
      }
      const result = await sdk.scheduledMessages.deleteScheduledMessage({
        scheduledMessageId,
      });
      printMutation(result, parsed.values.json, globals.verbose, () =>
        `cancelled scheduled message ${scheduledMessageId}`
      );
      return;
    }
    default:
      throw new UsageError("usage: pumble schedule list|cancel ...");
  }
}

async function resolveChannelId(sdk, input) {
  const value = input.startsWith("#") ? input.slice(1) : input;
  if (ID_RE.test(value)) return value;
  const channel = await findChannelByName(sdk, value);
  if (!channel) throw new CliError(`channel not found: ${input}`);
  return channel.id;
}

async function resolveUserId(sdk, input) {
  if (ID_RE.test(input)) return input;
  const user = await findUserByEmail(sdk, input);
  if (!user) throw new CliError(`user not found: ${input}`);
  return user.id;
}

function parseCommandArgs(args, options) {
  return parseArgs({
    args,
    options,
    allowPositionals: true,
    strict: true,
  });
}

function ensureNoPositionals(parsed, command) {
  if (parsed.positionals.length > 0) {
    throw new UsageError(`usage: pumble ${command}`);
  }
}

function printMutation(value, json, verbose, message) {
  if (json) printJson(value ?? { ok: true });
  else if (verbose) printLine(message(value));
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printLine(line) {
  process.stdout.write(`${line}\n`);
}

function formatChannel(channel) {
  const prefix = channel.channelType === "PRIVATE" ? "private" : "public";
  return `#${channel.name}\t${channel.id}\t${channel.channelType ?? prefix}`;
}

function formatMessageLike(message) {
  const ts = formatTimestamp(message.timestamp, message.timestampMilli);
  return `${ts}\t${message.channelId}\t${message.author}: ${oneLine(message.text)}`;
}

function formatScheduled(message) {
  const when = Number.isFinite(message.sendAt)
    ? new Date(message.sendAt).toISOString()
    : String(message.sendAt);
  return `${message.id}\t${message.channelId}\t${when}\t${oneLine(message.text)}`;
}

function formatTimestamp(timestamp, timestampMilli) {
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === "string") return timestamp;
  if (typeof timestampMilli === "number" && Number.isFinite(timestampMilli)) {
    return new Date(timestampMilli).toISOString();
  }
  return "";
}

function normaliseEmojiCode(code) {
  if (code.startsWith(":") && code.endsWith(":")) return code;
  return `:${code.replace(/^:+|:+$/g, "")}:`;
}

function oneLine(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function parsePositiveInt(value, flag) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new UsageError(`${flag} must be a positive integer`);
  }
  return n;
}

function parseNonNegativeInt(value, flag) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new UsageError(`${flag} must be a non-negative integer`);
  }
  return n;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw new UsageError(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  process.stdout.write(`
pumble — one-shot CLI for the Pumble API-Keys SDK

Usage:
  pumble [global options] whoami [--json]
  pumble [global options] channels list [--json]
  pumble [global options] channels create <name> [--private] [--json]
  pumble [global options] send <channel-id|#name> <text> [--json]
  pumble [global options] dm <user-id|email> <text> [--json]
  pumble [global options] search <query> [--limit N] [--json]
  pumble [global options] messages <channel-id|#name> [--limit N] [--json]
  pumble [global options] status set <emoji> <text> [--expires-at <ms>]
  pumble [global options] status clear
  pumble [global options] schedule list [--channel X] [--limit N] [--json]
  pumble [global options] schedule cancel <id> [--json]

Global options:
  --api-key-auth <key>  API key. Defaults to PUMBLE_API_KEY, then PUMBLESDK_API_KEY_AUTH.
  --base-url <url>      API base URL. Defaults to PUMBLE_BASE_URL, then the production endpoint.
  --timeout-ms <ms>     Per-request timeout in milliseconds.
  -v, --verbose         Print success messages for write commands.
  -h, --help            Show this help.

Examples:
  pumble whoami
  pumble channels list --json
  pumble send '#general' "deploy finished"
  pumble search "incident" --limit 5
`);
}

main(process.argv.slice(2)).catch((err) => {
  const code = err instanceof UsageError ? 2 : 1;
  process.stderr.write(`pumble: ${formatError(err)}\n`);
  if (err instanceof UsageError) {
    process.stderr.write("Run `pumble --help` for usage.\n");
  }
  process.exit(code);
});

function formatError(err) {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const anyErr = err;
    const body = anyErr.body ?? anyErr.error ?? anyErr.rawBody;
    if (body && typeof body === "object") {
      const message = body.localizedMessage ?? body.message ?? body.error;
      if (message) return String(message);
    }
    if (typeof anyErr.localizedMessage === "string") return anyErr.localizedMessage;
    if (typeof anyErr.message === "string") return anyErr.message;
    if (typeof anyErr.error === "string") return anyErr.error;
  }
  return String(err);
}
