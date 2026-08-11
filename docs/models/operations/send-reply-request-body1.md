# SendReplyRequestBody1

## Example Usage

```typescript
import { SendReplyRequestBody1 } from "pumble-keys-sdk/models/operations";

let value: SendReplyRequestBody1 = {
  channelId: "<id>",
  messageId: "<id>",
  text: "<value>",
};
```

## Fields

| Field                                                    | Type                                                     | Required                                                 | Description                                              |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `channelId`                                              | *string*                                                 | :heavy_check_mark:                                       | N/A                                                      |
| `channel`                                                | *string*                                                 | :heavy_minus_sign:                                       | N/A                                                      |
| `messageId`                                              | *string*                                                 | :heavy_check_mark:                                       | ID of the message to reply to (the thread root).         |
| `text`                                                   | *string*                                                 | :heavy_check_mark:                                       | N/A                                                      |
| `alsoSendToChannel`                                      | *boolean*                                                | :heavy_minus_sign:                                       | If true, also broadcast the reply to the parent channel. |
| `asBot`                                                  | *boolean*                                                | :heavy_minus_sign:                                       | N/A                                                      |