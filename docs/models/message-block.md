# MessageBlock

## Example Usage

```typescript
import { MessageBlock } from "pumble-keys-sdk/models";

let value: MessageBlock = {
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
};
```

## Fields

| Field                                                      | Type                                                       | Required                                                   | Description                                                | Example                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `type`                                                     | *string*                                                   | :heavy_minus_sign:                                         | N/A                                                        | rich_text                                                  |
| `elements`                                                 | [models.RichTextElement](../models/rich-text-element.md)[] | :heavy_minus_sign:                                         | N/A                                                        |                                                            |