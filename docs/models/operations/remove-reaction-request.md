# RemoveReactionRequest

## Example Usage

```typescript
import { RemoveReactionRequest } from "pumble-sdk/models/operations";

let value: RemoveReactionRequest = {
  messageId: "bbbbbbbbbbbbbbbbbbbb0001",
  channelId: "bbbbbbbbbbbbbbbbbbbb0001",
  reaction: ":+1:",
};
```

## Fields

| Field                                        | Type                                         | Required                                     | Description                                  | Example                                      |
| -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `messageId`                                  | *string*                                     | :heavy_check_mark:                           | N/A                                          | bbbbbbbbbbbbbbbbbbbb0001                     |
| `channelId`                                  | *string*                                     | :heavy_minus_sign:                           | N/A                                          | bbbbbbbbbbbbbbbbbbbb0001                     |
| `reaction`                                   | *string*                                     | :heavy_check_mark:                           | Emoji code in `:emoji_name:` form to remove. | :+1:                                         |