# SendReplyRequest

## Example Usage

```typescript
import { SendReplyRequest } from "pumble-sdk/models/operations";

let value: SendReplyRequest = {
  messageId: "<id>",
  text: "<value>",
};
```

## Fields

| Field                                                    | Type                                                     | Required                                                 | Description                                              |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `channelId`                                              | *string*                                                 | :heavy_minus_sign:                                       | N/A                                                      |
| `channel`                                                | *string*                                                 | :heavy_minus_sign:                                       | N/A                                                      |
| `messageId`                                              | *string*                                                 | :heavy_check_mark:                                       | ID of the message to reply to (the thread root).         |
| `text`                                                   | *string*                                                 | :heavy_check_mark:                                       | N/A                                                      |
| `alsoSendToChannel`                                      | *boolean*                                                | :heavy_minus_sign:                                       | If true, also broadcast the reply to the parent channel. |
| `asBot`                                                  | *boolean*                                                | :heavy_minus_sign:                                       | N/A                                                      |