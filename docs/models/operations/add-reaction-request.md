# AddReactionRequest

## Example Usage

```typescript
import { AddReactionRequest } from "pumble-sdk/models/operations";

let value: AddReactionRequest = {
  messageId: "<id>",
  reaction: "<value>",
};
```

## Fields

| Field                                            | Type                                             | Required                                         | Description                                      |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| `messageId`                                      | *string*                                         | :heavy_check_mark:                               | N/A                                              |
| `channelId`                                      | *string*                                         | :heavy_minus_sign:                               | N/A                                              |
| `reaction`                                       | *string*                                         | :heavy_check_mark:                               | Emoji code in `:emoji_name:` form (e.g. `:+1:`). |
| `skinTone`                                       | *number*                                         | :heavy_minus_sign:                               | N/A                                              |