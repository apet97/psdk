# ScheduledMessageRef

Lightweight reference returned by `createScheduledMessage`.

## Example Usage

```typescript
import { ScheduledMessageRef } from "pumble-keys-sdk/models";

let value: ScheduledMessageRef = {
  id: "dddddddddddddddddddd0001",
  channelId: "bbbbbbbbbbbbbbbbbbbb0002",
};
```

## Fields

| Field                    | Type                     | Required                 | Description              | Example                  |
| ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| `id`                     | *string*                 | :heavy_check_mark:       | N/A                      | dddddddddddddddddddd0001 |
| `channelId`              | *string*                 | :heavy_check_mark:       | N/A                      | bbbbbbbbbbbbbbbbbbbb0002 |