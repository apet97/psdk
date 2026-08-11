# CustomStatus

A user's custom status (the value, not the update payload).

## Example Usage

```typescript
import { CustomStatus } from "pumble-keys-sdk/models";

let value: CustomStatus = {
  code: ":beach_with_umbrella:",
  status: "Time off",
  expiration: "custom",
  expiresAt: 1893456000000,
  showUntil: true,
};
```

## Fields

| Field                                                | Type                                                 | Required                                             | Description                                          | Example                                              |
| ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `code`                                               | *string*                                             | :heavy_minus_sign:                                   | Emoji code in `:emoji_name:` form.                   | :beach_with_umbrella:                                |
| `status`                                             | *string*                                             | :heavy_minus_sign:                                   | Free-form status text.                               | Time off                                             |
| `expiration`                                         | *string*                                             | :heavy_minus_sign:                                   | Expiration mode (e.g. `custom`, `dont_clear`).       | custom                                               |
| `expiresAt`                                          | *number*                                             | :heavy_minus_sign:                                   | Epoch-ms moment the status auto-clears (0 if never). | 1893456000000                                        |
| `showUntil`                                          | *boolean*                                            | :heavy_minus_sign:                                   | N/A                                                  | true                                                 |