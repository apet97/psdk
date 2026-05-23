# SendMessageRequest


## Supported Types

### `operations.SendMessageRequestBody1`

```typescript
const value: operations.SendMessageRequestBody1 = {
  channelId: "<id>",
  text: "<value>",
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
};
```

### `operations.SendMessageRequestBody2`

```typescript
const value: operations.SendMessageRequestBody2 = {
  channel: "<value>",
  text: "<value>",
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
};
```

