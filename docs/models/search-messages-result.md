# SearchMessagesResult

## Example Usage

```typescript
import { SearchMessagesResult } from "pumble-sdk/models";

let value: SearchMessagesResult = {
  content: [],
  totalElements: 0,
  hasMore: false,
};
```

## Fields

| Field                                         | Type                                          | Required                                      | Description                                   | Example                                       |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| `content`                                     | [models.SearchHit](../models/search-hit.md)[] | :heavy_check_mark:                            | N/A                                           |                                               |
| `totalElements`                               | *number*                                      | :heavy_check_mark:                            | Total matches across all pages.               | 0                                             |
| `hasMore`                                     | *boolean*                                     | :heavy_check_mark:                            | N/A                                           | false                                         |