# MessageList

Paginated message list. `hasMoreBefore` / `hasMoreAfter` are nullable —
the server returns `null` for the side that's irrelevant to the chosen
`strategy` (e.g. `strategy=AFTER` yields `hasMoreBefore=null`).


## Example Usage

```typescript
import { MessageList } from "pumble-sdk/models";

let value: MessageList = {
  messages: [],
  hasMoreBefore: false,
  hasMoreAfter: null,
};
```

## Fields

| Field                                    | Type                                     | Required                                 | Description                              |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `messages`                               | [models.Message](../models/message.md)[] | :heavy_check_mark:                       | N/A                                      |
| `hasMoreBefore`                          | *boolean*                                | :heavy_minus_sign:                       | N/A                                      |
| `hasMoreAfter`                           | *boolean*                                | :heavy_minus_sign:                       | N/A                                      |