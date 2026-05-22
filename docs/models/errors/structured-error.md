# StructuredError

Structured validation error from the framework layer.

## Example Usage

```typescript
import { StructuredError } from "pumble-sdk/models/errors";

// No examples available for this model
```

## Fields

| Field                                                                 | Type                                                                  | Required                                                              | Description                                                           | Example                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `message`                                                             | *string*                                                              | :heavy_check_mark:                                                    | Raw error message.                                                    | [Allowed values are PUBLIC\|PRIVATE]                                  |
| `localizedMessage`                                                    | *string*                                                              | :heavy_check_mark:                                                    | Localized variant of `message` (often identical for English clients). | [Allowed values are PUBLIC\|PRIVATE]                                  |
| `code`                                                                | *number*                                                              | :heavy_check_mark:                                                    | Internal error code.                                                  | 400000                                                                |