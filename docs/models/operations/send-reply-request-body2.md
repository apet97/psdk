# SendReplyRequestBody2

## Example Usage

```typescript
import { SendReplyRequestBody2 } from "pumble-sdk/models/operations";

let value: SendReplyRequestBody2 = {
  channel: "<value>",
  messageId: "<id>",
  text: "<value>",
};
```

## Fields

| Field                                                    | Type                                                     | Required                                                 | Description                                              |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `channelId`                                              | *string*                                                 | :heavy_minus_sign:                                       | N/A                                                      |
| `channel`                                                | *string*                                                 | :heavy_check_mark:                                       | N/A                                                      |
| `messageId`                                              | *string*                                                 | :heavy_check_mark:                                       | ID of the message to reply to (the thread root).         |
| `text`                                                   | *string*                                                 | :heavy_check_mark:                                       | N/A                                                      |
| `alsoSendToChannel`                                      | *boolean*                                                | :heavy_minus_sign:                                       | If true, also broadcast the reply to the parent channel. |
| `asBot`                                                  | *boolean*                                                | :heavy_minus_sign:                                       | N/A                                                      |