# CustomStatusRequest

## Example Usage

```typescript
import { CustomStatusRequest } from "pumble-sdk/models/operations";

let value: CustomStatusRequest = {
  code: ":beach_with_umbrella:",
  status: "Time off",
  expiresAt: 726834,
};
```

## Fields

| Field                                            | Type                                             | Required                                         | Description                                      | Example                                          |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| `code`                                           | *string*                                         | :heavy_check_mark:                               | Emoji code in `:emoji_name:` form.               | :beach_with_umbrella:                            |
| `status`                                         | *string*                                         | :heavy_minus_sign:                               | Free-form status text.                           | Time off                                         |
| `expiresAt`                                      | *number*                                         | :heavy_check_mark:                               | Epoch-ms moment to clear the status (0 = never). |                                                  |