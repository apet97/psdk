#!/usr/bin/env node
// First-class one-shot CLI for the generated Pumble SDK.
//
// Hand-written and regen-safe: this file lives in sdk/bin/ and is wired
// through sdk/.speakeasy/gen.yaml additionalPackageJSON.bin.

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { PumbleSDK } from "../esm/index.js";
import { resolveChannel, resolveUser } from "../esm/extensions/resolve.js";

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
  if (globals.version) {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    process.stdout.write(`${pkg.version}\n`);
    return;
  }
  if (globals.help || args.length === 0) {
    printHelp();
    return;
  }

  const [command, ...rest] = args;
  if (command === "doctor") {
    return cmdDoctor(globals);
  }
  if (command === "help") {
    printHelp();
    return;
  }

  const sdk = createClient(globals);

  switch (command) {
    case "whoami":
      return cmdWhoami(sdk, rest);
    case "channels":
      return cmdChannels(sdk, rest, globals);
    case "users":
      return cmdUsers(sdk, rest);
    case "send":
      return cmdSend(sdk, rest, globals);
    case "dm":
      return cmdDm(sdk, rest, globals);
    case "search":
      return cmdSearch(sdk, rest);
    case "messages":
      return cmdMessages(sdk, rest);
    case "thread":
      return cmdThread(sdk, rest);
    case "status":
      return cmdStatus(sdk, rest, globals);
    case "schedule":
      return cmdSchedule(sdk, rest, globals);
    default:
      throw new UsageError(`unknown command: ${command}`);
  }
}

async function cmdDoctor(globals) {
  const key = resolveApiKey(globals);
  const masked = key.length >= 4
    ? "*".repeat(Math.max(0, key.length - 4)) + key.slice(-4)
    : "(none)";
  process.stdout.write(`api key: ${masked}\n`);
  process.stdout.write(`base url: ${globals.baseURL}\n`);
}

function parseGlobalOptions(argv) {
  const globals = {
    apiKey: null,
    apiKeyFile: null,
    apiKeyStdin: false,
    baseURL: process.env.PUMBLE_BASE_URL ?? process.env.PUMBLESDK_SERVER_URL ?? DEFAULT_BASE_URL,
    timeoutMs: undefined,
    verbose: false,
    quiet: false,
    help: false,
    version: false,
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
    if (arg === "--api-key-file") {
      globals.apiKeyFile = requireValue(argv, ++i, arg);
      continue;
    }
    if (arg.startsWith("--api-key-file=")) {
      globals.apiKeyFile = arg.slice("--api-key-file=".length);
      continue;
    }
    if (arg === "--api-key-stdin") {
      globals.apiKeyStdin = true;
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
    if (arg === "--quiet" || arg === "-q") {
      globals.quiet = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      globals.help = true;
      continue;
    }
    if (arg === "--version") {
      globals.version = true;
      continue;
    }
    args.push(arg);
  }

  return { globals, args };
}

function createClient(globals) {
  const apiKey = resolveApiKey(globals);
  if (!apiKey) {
    throw new UsageError(
      "missing API key; set PUMBLE_API_KEY or pass --api-key-file <path>",
    );
  }
  return new PumbleSDK({
    apiKeyAuth: apiKey,
    serverURL: globals.baseURL,
    timeoutMs: globals.timeoutMs,
  });
}

function readStdin() {
  return readFileSync(0, "utf8").trim();
}

function resolveApiKey(globals) {
  if (globals.apiKeyFile) return readFileSync(globals.apiKeyFile, "utf8").trim();
  if (globals.apiKeyStdin) return readStdin();
  return process.env.PUMBLE_API_KEY
    ?? process.env.PUMBLESDK_API_KEY_AUTH
    ?? globals.apiKey
    ?? "";
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
        throw new UsageError("usage: pumble-keys channels create <name> [--private] [--json]");
      }
      const created = await sdk.channels.createChannel({
        name,
        type: parsed.values.private ? "PRIVATE" : "PUBLIC",
      });
      printMutation(created, parsed.values.json, { verbose: globals.verbose, quiet: globals.quiet }, (c) =>
        `created #${c.name ?? name} (${c.id})`
      );
      return;
    }
    case "find": {
      const parsed = parseCommandArgs(rest, {
        json: { type: "boolean", default: false },
      });
      const [query, ...extra] = parsed.positionals;
      if (!query || extra.length > 0) {
        throw new UsageError("usage: pumble-keys channels find <name-or-id> [--json]");
      }
      const result = await resolveChannel(sdk, query);
      if (!result.ok) throw resolveCliError("channel", query, result);
      if (parsed.values.json) printJson(result.value);
      else printLine(formatChannel(result.value));
      return;
    }
    default:
      throw new UsageError("usage: pumble-keys channels list|find|create ...");
  }
}

async function cmdUsers(sdk, args) {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case "find": {
      const parsed = parseCommandArgs(rest, {
        json: { type: "boolean", default: false },
      });
      const [query, ...extra] = parsed.positionals;
      if (!query || extra.length > 0) {
        throw new UsageError("usage: pumble-keys users find <email-or-id> [--json]");
      }
      const result = await resolveUser(sdk, query);
      if (!result.ok) throw resolveCliError("user", query, result);
      if (parsed.values.json) printJson(result.value);
      else printLine(formatUser(result.value));
      return;
    }
    default:
      throw new UsageError("usage: pumble-keys users find ...");
  }
}

async function cmdSend(sdk, args, globals) {
  const parsed = parseCommandArgs(args, {
    json: { type: "boolean", default: false },
  });
  const [channelArg, ...textParts] = parsed.positionals;
  const text = textParts.join(" ");
  if (!channelArg || !text) {
    throw new UsageError("usage: pumble-keys send <channel> <text> [--json]");
  }
  const channelId = await resolveChannelId(sdk, channelArg);
  const sent = await sdk.messages.sendMessage({ channelId, text });
  printMutation(sent, parsed.values.json, { verbose: globals.verbose, quiet: globals.quiet }, (m) =>
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
    throw new UsageError("usage: pumble-keys dm <user-id-or-email> <text> [--json]");
  }
  const userId = await resolveUserId(sdk, userArg);
  const sent = await sdk.messages.dmUser({ userId, text });
  printMutation(sent, parsed.values.json, { verbose: globals.verbose, quiet: globals.quiet }, (m) =>
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
    throw new UsageError("usage: pumble-keys search <query> [--limit N] [--json]");
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
    throw new UsageError("usage: pumble-keys messages <channel> [--limit N] [--json]");
  }
  const limit = parsePositiveInt(parsed.values.limit, "--limit");
  const channelId = await resolveChannelId(sdk, channelArg);
  const page = await sdk.messages.listMessages({ channelId, limit });
  const messages = (page.result?.messages ?? []).slice(0, limit);
  if (parsed.values.json) printJson(messages);
  else messages.forEach((message) => printLine(formatMessageLike(message)));
}

async function cmdThread(sdk, args) {
  const parsed = parseCommandArgs(args, {
    channel: { type: "string" },
    limit: { type: "string", default: "10" },
    json: { type: "boolean", default: false },
  });
  const [messageId, ...extra] = parsed.positionals;
  if (!messageId || extra.length > 0 || !parsed.values.channel) {
    throw new UsageError("usage: pumble-keys thread <message-id> --channel <channel> [--limit N] [--json]");
  }
  const limit = parsePositiveInt(parsed.values.limit, "--limit");
  const channelId = await resolveChannelId(sdk, parsed.values.channel);
  const [root, repliesPage] = await Promise.all([
    sdk.messages.fetchMessage({ channelId, messageId }),
    sdk.messages.fetchThreadReplies({ channelId, rootMessageId: messageId, limit }),
  ]);
  const replies = (repliesPage.result ?? []).slice(0, limit);
  const context = { root, replies };
  if (parsed.values.json) printJson(context);
  else {
    printLine(formatMessageLike(root));
    replies.forEach((reply) => printLine(formatMessageLike(reply)));
  }
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
          "usage: pumble-keys status set <emoji> <text> [--expires-at <ms>] [--json]",
        );
      }
      const result = await sdk.users.customStatus({
        code: normaliseEmojiCode(code),
        status,
        expiresAt: parseNonNegativeInt(parsed.values["expires-at"], "--expires-at"),
      });
      printMutation(result, parsed.values.json, { verbose: globals.verbose, quiet: globals.quiet }, () => "status updated");
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
      printMutation(result, parsed.values.json, { verbose: globals.verbose, quiet: globals.quiet }, () => "status cleared");
      return;
    }
    default:
      throw new UsageError("usage: pumble-keys status set|clear ...");
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
        throw new UsageError("usage: pumble-keys schedule cancel <id> [--json]");
      }
      const result = await sdk.scheduledMessages.deleteScheduledMessage({
        scheduledMessageId,
      });
      printMutation(result, parsed.values.json, { verbose: globals.verbose, quiet: globals.quiet }, () =>
        `cancelled scheduled message ${scheduledMessageId}`
      );
      return;
    }
    default:
      throw new UsageError("usage: pumble-keys schedule list|cancel ...");
  }
}

async function resolveChannelId(sdk, input) {
  const value = input.startsWith("#") ? input.slice(1) : input;
  if (ID_RE.test(value)) return value;
  const result = await resolveChannel(sdk, input);
  if (!result.ok) throw resolveCliError("channel", input, result);
  return result.value.id;
}

async function resolveUserId(sdk, input) {
  if (ID_RE.test(input)) return input;
  const result = await resolveUser(sdk, input);
  if (!result.ok) throw resolveCliError("user", input, result);
  return result.value.id;
}

function resolveCliError(kind, input, result) {
  if (result.reason === "ambiguous") {
    const choices = result.candidates
      .map((choice) => choice.label ?? ("email" in choice
        ? `${choice.name} <${choice.email}> (${choice.id})`
        : `#${choice.name} (${choice.id})`))
      .join(", ");
    return new CliError(`${kind} is ambiguous: ${input}. Choices: ${choices}`);
  }
  return new CliError(`${kind} not found: ${input}`);
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
    throw new UsageError(`usage: pumble-keys ${command}`);
  }
}

function printMutation(value, json, quietOrVerbose, message) {
  if (json) {
    printJson(value ?? { ok: true });
    return;
  }
  // Backwards-compatible second-positional accepts a boolean (verbose flag)
  // or an options object { quiet, verbose }. Default behaviour: print the
  // one-line success message unless quiet is set.
  const opts = typeof quietOrVerbose === "object" && quietOrVerbose !== null
    ? quietOrVerbose
    : { verbose: quietOrVerbose === true, quiet: false };
  if (opts.quiet) return;
  printLine(message(value));
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

function formatUser(user) {
  return `${user.name} <${user.email}>\t${user.id}`;
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
pumble-keys — one-shot CLI for the Pumble API-Keys SDK

Usage:
  pumble-keys [global options] whoami [--json]
  pumble-keys [global options] channels list [--json]
  pumble-keys [global options] channels find <name-or-id> [--json]
  pumble-keys [global options] channels create <name> [--private] [--json]
  pumble-keys [global options] users find <email-or-id> [--json]
  pumble-keys [global options] send <channel-id|#name> <text> [--json]
  pumble-keys [global options] dm <user-id|email> <text> [--json]
  pumble-keys [global options] search <query> [--limit N] [--json]
  pumble-keys [global options] messages <channel-id|#name> [--limit N] [--json]
  pumble-keys [global options] thread <message-id> --channel <channel-id|#name> [--limit N] [--json]
  pumble-keys [global options] status set <emoji> <text> [--expires-at <ms>]
  pumble-keys [global options] status clear
  pumble-keys [global options] schedule list [--channel X] [--limit N] [--json]
  pumble-keys [global options] schedule cancel <id> [--json]

Global options:
  --api-key-file <path>  Read API key from a local file.
  --api-key-stdin        Read API key from stdin.
  --api-key-auth <key>   Legacy direct API key flag. Prefer env, file, or stdin;
                          command-line secrets can leak through shell history,
                          process listings, CI logs, and terminal recordings.
                          --api-key is accepted as a legacy alias.
  --base-url <url>       API base URL. Defaults to PUMBLE_BASE_URL, then the production endpoint.
  --timeout-ms <ms>      Per-request timeout in milliseconds.
  -v, --verbose          Print success messages for write commands.
  -q, --quiet            Suppress the default one-line success message for write commands.
  --version              Print the package version and exit.
  -h, --help             Show this help.

Prefer \`PUMBLE_API_KEY\`, \`--api-key-file\`, or \`--api-key-stdin\` over command-line keys.

Examples:
  pumble-keys whoami
  pumble-keys channels list --json
  pumble-keys channels find general
  pumble-keys users find ada@example.com
  pumble-keys send '#general' "deploy finished"
  pumble-keys search "incident" --limit 5
`);
}

main(process.argv.slice(2)).catch((err) => {
  const code = err instanceof UsageError ? 2 : 1;
  process.stderr.write(`pumble-keys: ${formatError(err)}\n`);
  if (err instanceof UsageError) {
    process.stderr.write("Run `pumble-keys --help` for usage.\n");
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
