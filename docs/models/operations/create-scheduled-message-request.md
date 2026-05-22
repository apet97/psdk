# CreateScheduledMessageRequest

## Example Usage

```typescript
import { CreateScheduledMessageRequest } from "pumble-sdk/models/operations";

let value: CreateScheduledMessageRequest = {
  channelId: "<id>",
  text: "<value>",
  sendAt: 335586,
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
| `channelId`                                                                         | *string*                                                                            | :heavy_check_mark:                                                                  | N/A                                                                                 |                                                                                     |
| `text`                                                                              | *string*                                                                            | :heavy_check_mark:                                                                  | N/A                                                                                 |                                                                                     |
| `sendAt`                                                                            | *number*                                                                            | :heavy_check_mark:                                                                  | Delivery moment (epoch ms). Must be in the future.                                  |                                                                                     |
| `blocks`                                                                            | [models.MessageBlock](../../models/message-block.md)[]                              | :heavy_minus_sign:                                                                  | N/A                                                                                 |                                                                                     |
| `threadRootId`                                                                      | *string*                                                                            | :heavy_minus_sign:                                                                  | If set, the scheduled message will be sent as a thread reply.                       |                                                                                     |
| `alsoSendToChannel`                                                                 | *boolean*                                                                           | :heavy_minus_sign:                                                                  | N/A                                                                                 |                                                                                     |
| `recurrence`                                                                        | [models.Recurrence](../../models/recurrence.md)                                     | :heavy_minus_sign:                                                                  | N/A                                                                                 | {<br/>"recurrenceType": "WEEKLY",<br/>"endAfterOccurrences": 10,<br/>"endDate": 1893459600000<br/>} |