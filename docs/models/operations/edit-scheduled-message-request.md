# EditScheduledMessageRequest

## Example Usage

```typescript
import { EditScheduledMessageRequest } from "pumble-keys-sdk/models/operations";

let value: EditScheduledMessageRequest = {
  scheduledMessageId: "<id>",
  channelId: "<id>",
  text: "<value>",
  sendAt: 350587,
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
  recurrence: {
    recurrenceType: "WEEKLY",
    endAfterOccurrences: 10,
    endDate: 1893459600000,
  },
};
```

## Fields

| Field                                                                               | Type                                                                                | Required                                                                            | Description                                                                         | Example                                                                             |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `scheduledMessageId`                                                                | *string*                                                                            | :heavy_check_mark:                                                                  | N/A                                                                                 |                                                                                     |
| `channelId`                                                                         | *string*                                                                            | :heavy_check_mark:                                                                  | N/A                                                                                 |                                                                                     |
| `text`                                                                              | *string*                                                                            | :heavy_check_mark:                                                                  | N/A                                                                                 |                                                                                     |
| `sendAt`                                                                            | *number*                                                                            | :heavy_check_mark:                                                                  | Delivery moment (epoch ms). Required even if unchanged.                             |                                                                                     |
| `blocks`                                                                            | [models.MessageBlock](../../models/message-block.md)[]                              | :heavy_minus_sign:                                                                  | N/A                                                                                 |                                                                                     |
| `recurrence`                                                                        | [models.Recurrence](../../models/recurrence.md)                                     | :heavy_minus_sign:                                                                  | N/A                                                                                 | {<br/>"recurrenceType": "WEEKLY",<br/>"endAfterOccurrences": 10,<br/>"endDate": 1893459600000<br/>} |