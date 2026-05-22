# FetchThreadRepliesResponse

## Example Usage

```typescript
import { FetchThreadRepliesResponse } from "pumble-sdk/models/operations";

let value: FetchThreadRepliesResponse = {
  result: [
    {
      id: "cccccccccccccccccccc0001",
      channelId: "bbbbbbbbbbbbbbbbbbbb0002",
      workspaceId: "aaaaaaaaaaaaaaaaaaaa0000",
      author: "aaaaaaaaaaaaaaaaaaaa0001",
      text: "Hello world",
      blocks: [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_section",
              elements: [
                {
                  type: "text",
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      ],
      attachments: [],
      files: [],
      reactions: [],
      deleted: false,
      edited: false,
      isFollowing: true,
      timestamp: new Date("2026-05-21T21:23:04Z"),
      timestampMilli: 1779398584000,
    },
  ],
};
```

## Fields

| Field                                       | Type                                        | Required                                    | Description                                 |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `result`                                    | [models.Message](../../models/message.md)[] | :heavy_check_mark:                          | N/A                                         |