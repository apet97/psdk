# MessageRef

Lightweight reference returned by write operations.

## Example Usage

```typescript
import { MessageRef } from "pumble-sdk/models";

let value: MessageRef = {
  id: "cccccccccccccccccccc0001",
  channelId: "bbbbbbbbbbbbbbbbbbbb0002",
};
```

## Fields

| Field                                             | Type                                              | Required                                          | Description                                       | Example                                           |
| ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `id`                                              | *string*                                          | :heavy_check_mark:                                | Server-assigned message identifier (24-char hex). | cccccccccccccccccccc0001                          |
| `channelId`                                       | *string*                                          | :heavy_check_mark:                                | ID of the channel that contains the message.      | bbbbbbbbbbbbbbbbbbbb0002                          |