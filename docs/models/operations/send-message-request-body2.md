# SendMessageRequestBody2

## Example Usage

```typescript
import { SendMessageRequestBody2 } from "pumble-keys-sdk/models/operations";

let value: SendMessageRequestBody2 = {
  channel: "<value>",
  text: "<value>",
  blocks: [
    {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_section",
          elements: [
            {
              type: "text",
              text: "Hello world",
            },
          ],
        },
      ],
    },
  ],
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `channelId`                                                                                | *string*                                                                                   | :heavy_minus_sign:                                                                         | N/A                                                                                        |
| `channel`                                                                                  | *string*                                                                                   | :heavy_check_mark:                                                                         | Channel name; ignored if `channelId` is provided.                                          |
| `text`                                                                                     | *string*                                                                                   | :heavy_check_mark:                                                                         | N/A                                                                                        |
| `threadRootId`                                                                             | *string*                                                                                   | :heavy_minus_sign:                                                                         | If set, post as a reply in this thread.                                                    |
| `asBot`                                                                                    | *boolean*                                                                                  | :heavy_minus_sign:                                                                         | If true, the message is authored by the addon's bot identity instead of the API-key owner. |
| `blocks`                                                                                   | [models.MessageBlock](../../models/message-block.md)[]                                     | :heavy_minus_sign:                                                                         | Pumble rich-text blocks. If provided, takes precedence over `text` for rendering.          |