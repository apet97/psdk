#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, "..");

const unsafeWriteFunctionFiles = [
  "src/funcs/messages-send-message.ts",
  "src/funcs/messages-send-reply.ts",
  "src/funcs/messages-dm-user.ts",
  "src/funcs/messages-dm-group.ts",
  "src/funcs/scheduled-messages-create-scheduled-message.ts",
];

for (const relativePath of unsafeWriteFunctionFiles) {
  patchFile(resolve(sdkRoot, relativePath), [
    {
      before: 'retryCodes: options?.retryCodes || ["429", "500", "502", "503", "504"],',
      after: "retryCodes: options?.retryCodes || [],",
    },
  ]);
}

patchFile(resolve(sdkRoot, "src/lib/sdks.ts"), [
  {
    before: 'import { SDKHooks } from "../hooks/hooks.js";',
    after: 'import { redactDebugHeaders, redactDebugValue } from "../extensions/debug-redaction.js";\nimport { SDKHooks } from "../hooks/hooks.js";',
  },
  {
    before: `  logger.group("Headers:");
  for (const [k, v] of req.headers.entries()) {
    logger.log(\`\${k}: \${v}\`);
  }
  logger.groupEnd();`,
    after: `  logger.group("Headers:");
  for (const [k, v] of Object.entries(redactDebugHeaders(req.headers))) {
    logger.log(\`\${k}: \${v}\`);
  }
  logger.groupEnd();`,
  },
  {
    before: "      logger.log(await req.clone().json());",
    after: "      logger.log(redactDebugValue(await req.clone().json()));",
  },
  {
    before: "      logger.log(await req.clone().text());",
    after: "      logger.log(redactDebugValue(await req.clone().text()));",
  },
  {
    before: "        const vlabel = v instanceof Blob ? \"<Blob>\" : v;",
    after: "        const vlabel = v instanceof Blob ? \"<Blob>\" : redactDebugValue(v, k);",
  },
  {
    before: `  logger.group("Headers:");
  for (const [k, v] of res.headers.entries()) {
    logger.log(\`\${k}: \${v}\`);
  }
  logger.groupEnd();`,
    after: `  logger.group("Headers:");
  for (const [k, v] of Object.entries(redactDebugHeaders(res.headers))) {
    logger.log(\`\${k}: \${v}\`);
  }
  logger.groupEnd();`,
  },
  {
    before: "      logger.log(await res.clone().json());",
    after: "      logger.log(redactDebugValue(await res.clone().json()));",
  },
  {
    before: "      logger.log(await res.clone().text());",
    after: "      logger.log(redactDebugValue(await res.clone().text()));",
  },
]);

patchFile(resolve(sdkRoot, "src/lib/matchers.ts"), [
  {
    before: `      case "json":
        body = await response.text();
        raw = JSON.parse(body);
        break;`,
    after: `      case "json":
        body = await response.text();
        try {
          raw = JSON.parse(body);
        } catch (err) {
          return [{
            ok: false,
            error: new ResponseValidationError("Response validation failed", {
              request,
              response,
              body,
              cause: err,
              rawValue: body,
              rawMessage: "Response JSON parse failed",
            }),
          }, body];
        }
        break;`,
  },
]);

patchFile(resolve(sdkRoot, "src/lib/retries.ts"), [
  {
    before: `      let retryInterval = 0;
      if (err instanceof TemporaryError) {
        retryInterval = retryIntervalFromResponse(err.response);
      }

      if (retryInterval <= 0) {
        retryInterval =
          initialInterval * Math.pow(x, exponent) + Math.random() * 1000;
      }`,
    after: `      let retryInterval: number | undefined;
      if (err instanceof TemporaryError) {
        retryInterval = retryIntervalFromResponse(err.response);
      }

      if (retryInterval === undefined) {
        const attempt = Math.max(1, x);
        retryInterval =
          initialInterval * Math.pow(attempt, exponent) + Math.random() * 1000;
      }`,
  },
  {
    before: `function retryIntervalFromResponse(res: Response): number {
  const retryVal = res.headers.get("retry-after") || "";
  if (!retryVal) {
    return 0;
  }`,
    after: `function retryIntervalFromResponse(res: Response): number | undefined {
  const retryVal = res.headers.get("retry-after") || "";
  if (!retryVal) {
    return undefined;
  }`,
  },
  {
    before: `  return 0;
}

async function delay(delay: number): Promise<void> {`,
    after: `  return undefined;
}

async function delay(delay: number): Promise<void> {`,
  },
]);

patchFile(resolve(sdkRoot, "src/models/operations/send-message.ts"), [
  { before: "channel: z.string(),", after: "channel: z.string().min(1)," },
  { before: "channelId: z.string(),", after: "channelId: z.string().min(1)," },
  { before: "text: z.string(),", after: "text: z.string().min(1)," },
]);

patchFile(resolve(sdkRoot, "src/models/operations/send-reply.ts"), [
  { before: "channel: z.string(),", after: "channel: z.string().min(1)," },
  { before: "channelId: z.string(),", after: "channelId: z.string().min(1)," },
  { before: "messageId: z.string(),", after: "messageId: z.string().min(1)," },
  { before: "text: z.string(),", after: "text: z.string().min(1)," },
]);

patchFile(resolve(sdkRoot, "src/models/operations/dm-user.ts"), [
  { before: "userId: z.string(),", after: "userId: z.string().min(1)," },
  { before: "text: z.string(),", after: "text: z.string().min(1)," },
]);

patchFile(resolve(sdkRoot, "src/models/operations/dm-group.ts"), [
  { before: "userIds: z.array(z.string()),", after: "userIds: z.array(z.string().min(1)).min(1)," },
  { before: "text: z.string(),", after: "text: z.string().min(1)," },
]);

patchFile(resolve(sdkRoot, "src/models/operations/create-scheduled-message.ts"), [
  { before: "channelId: z.string(),", after: "channelId: z.string().min(1)," },
  { before: "text: z.string(),", after: "text: z.string().min(1)," },
  { before: "sendAt: z.number().int(),", after: "sendAt: z.number().int().min(1)," },
]);

function patchFile(filePath, replacements) {
  let source = readFileSync(filePath, "utf8");

  for (const { before, after } of replacements) {
    if (after.includes(before) && source.includes(after)) continue;
    if (source.includes(before)) {
      source = source.split(before).join(after);
      continue;
    }
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Cannot patch generated runtime file ${filePath}: missing ${before}`);
    }
  }

  writeFileSync(filePath, source);
}
