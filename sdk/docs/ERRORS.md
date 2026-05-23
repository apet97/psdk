# Error Handling

## Facade failures are values

Facade target problems return `{ ok: false, summary, choices, nextActions }`.
Use `assertFacadeOk` when you prefer exceptions.

## Raw SDK methods throw

Generated resource methods such as `sdk.messages.sendMessage()` unwrap the
internal `Result` and throw SDK errors.

## ResponseValidationError

Malformed or schema-invalid responses are reported as `ResponseValidationError`.
The error includes the request, response, raw body, and validation cause.

## categorizeError

Use `categorizeError(error)` for logs and retry decisions.

## Lower-level Result

Advanced callers can import generated functions from `pumble-sdk/funcs/...`
when they need lower-level Result values instead of thrown raw SDK methods.
