# EditMessageRequest

## Example Usage

```typescript
import { EditMessageRequest } from "pumble-keys-sdk/models/operations";

let value: EditMessageRequest = {
  messageId: "<id>",
  channelId: "<id>",
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

| Field                                                  | Type                                                   | Required                                               | Description                                            |
| ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| `messageId`                                            | *string*                                               | :heavy_check_mark:                                     | N/A                                                    |
| `channelId`                                            | *string*                                               | :heavy_check_mark:                                     | N/A                                                    |
| `text`                                                 | *string*                                               | :heavy_check_mark:                                     | N/A                                                    |
| `blocks`                                               | [models.MessageBlock](../../models/message-block.md)[] | :heavy_minus_sign:                                     | N/A                                                    |