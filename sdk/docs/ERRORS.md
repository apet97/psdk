# Error Handling

## Facade failures are values

Facade target problems and facade API/transport failures return
`{ ok: false, summary, choices, nextActions }`. API and transport failure
values include `cause` for diagnostics. Use `assertFacadeOk` when you prefer
exceptions.

## Raw SDK methods throw

Generated resource methods such as `sdk.messages.sendMessage()` unwrap the
internal `Result` and throw SDK errors.

## Error Model By Surface

| Surface | Failure shape | Use when |
| --- | --- | --- |
| Raw SDK (`new PumbleSDK`) | Throws generated SDK errors such as `PumbleSDKError`, `PumbleSDKDefaultError`, `SDKValidationError`, and `ResponseValidationError`. | You want direct endpoint access and normal try/catch behavior. |
| Facade (`createPumbleClient`) | Returns `{ ok: false, summary, reason, nextActions }` for resolver and operation failures. | You want resolve-before-act workflows and printable receipts. |
| Lower-level helpers | Return `Result` or typed helper values where documented. | You are composing SDK internals or tests. |
| CLI (`pumble-keys`) | Prints human-readable errors or JSON, then exits non-zero. | You are scripting shell workflows. |
| MCP (`pumble-keys-mcp`) | Returns JSON-like tool envelopes with `ok`, `summary`, `ids`, `data`, and `nextActions`. | You are exposing Pumble workflows to agents. |

```ts
try {
  await sdk.messages.sendMessage({ channelId, text });
} catch (error) {
  const categorized = categorizeError(error);
  console.error(categorized.summary);
}

const result = await client.messages.send({ channel: "#ops", text });
if (!result.ok) {
  console.error(result.summary);
}
```

## ResponseValidationError

Malformed or schema-invalid responses are reported as `ResponseValidationError`.
The error includes the request, response, raw body, and validation cause.

## categorizeError

Use `categorizeError(error)` for logs and retry decisions.

Plain `401` and `403` responses are categorized as `permission`. A `403` with
Pumble's structured validation body (`localizedMessage`, numeric `code`, or a
message plus validation field details) is categorized as `validation`.

## Lower-level Result

Advanced callers can import generated functions from `pumble-keys-sdk/funcs/...`
when they need lower-level Result values instead of thrown raw SDK methods.
