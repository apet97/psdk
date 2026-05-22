# FetchScheduledMessagesResponse

## Example Usage

```typescript
import { FetchScheduledMessagesResponse } from "pumble-sdk/models/operations";

let value: FetchScheduledMessagesResponse = {
  result: {
    scheduledMessages: [],
    hasMore: false,
  },
};
```

## Fields

| Field                                                                 | Type                                                                  | Required                                                              | Description                                                           | Example                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `result`                                                              | [models.ScheduledMessageList](../../models/scheduled-message-list.md) | :heavy_check_mark:                                                    | N/A                                                                   | {<br/>"scheduledMessages": [],<br/>"hasMore": false<br/>}             |