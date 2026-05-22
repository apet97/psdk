# FetchThreadRepliesRequest

## Example Usage

```typescript
import { FetchThreadRepliesRequest } from "pumble-sdk/models/operations";

let value: FetchThreadRepliesRequest = {
  rootMessageId: "cccccccccccccccccccc0001",
  channelId: "bbbbbbbbbbbbbbbbbbbb0001",
  channel: "bbbbbbbbbbbbbbbbbbbb0001",
  cursor: "bbbbbbbbbbbbbbbbbbbb0001",
};
```

## Fields

| Field                                      | Type                                       | Required                                   | Description                                | Example                                    |
| ------------------------------------------ | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| `rootMessageId`                            | *string*                                   | :heavy_check_mark:                         | N/A                                        | cccccccccccccccccccc0001                   |
| `channelId`                                | *string*                                   | :heavy_minus_sign:                         | N/A                                        | bbbbbbbbbbbbbbbbbbbb0001                   |
| `channel`                                  | *string*                                   | :heavy_minus_sign:                         | N/A                                        | bbbbbbbbbbbbbbbbbbbb0001                   |
| `cursor`                                   | *string*                                   | :heavy_minus_sign:                         | ID of the last reply on the previous page. | bbbbbbbbbbbbbbbbbbbb0001                   |
| `limit`                                    | *number*                                   | :heavy_minus_sign:                         | N/A                                        | 100                                        |