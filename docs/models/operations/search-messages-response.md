# SearchMessagesResponse

## Example Usage

```typescript
import { SearchMessagesResponse } from "pumble-sdk/models/operations";

let value: SearchMessagesResponse = {
  result: {
    content: [],
    totalElements: 0,
    hasMore: false,
  },
};
```

## Fields

| Field                                                                 | Type                                                                  | Required                                                              | Description                                                           | Example                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `result`                                                              | [models.SearchMessagesResult](../../models/search-messages-result.md) | :heavy_check_mark:                                                    | N/A                                                                   | {<br/>"content": [],<br/>"totalElements": 0,<br/>"hasMore": false<br/>} |