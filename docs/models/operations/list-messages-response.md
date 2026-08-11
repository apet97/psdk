# ListMessagesResponse

## Example Usage

```typescript
import { ListMessagesResponse } from "pumble-keys-sdk/models/operations";

let value: ListMessagesResponse = {
  result: {
    messages: [],
    hasMoreBefore: false,
    hasMoreAfter: null,
  },
};
```

## Fields

| Field                                                            | Type                                                             | Required                                                         | Description                                                      | Example                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `result`                                                         | [models.MessageList](../../models/message-list.md)               | :heavy_check_mark:                                               | N/A                                                              | {<br/>"messages": [],<br/>"hasMoreBefore": false,<br/>"hasMoreAfter": null<br/>} |