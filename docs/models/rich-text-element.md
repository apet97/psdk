# RichTextElement

One node in Pumble's rich-text block structure. The full grammar is
large (Slack-like); only top-level fields are typed here.


## Example Usage

```typescript
import { RichTextElement } from "pumble-keys-sdk/models";

let value: RichTextElement = {
  type: "text",
  text: "Hello world",
};
```

## Fields

| Field                                                      | Type                                                       | Required                                                   | Description                                                | Example                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `type`                                                     | *string*                                                   | :heavy_minus_sign:                                         | N/A                                                        | text                                                       |
| `text`                                                     | *string*                                                   | :heavy_minus_sign:                                         | N/A                                                        | Hello world                                                |
| `elements`                                                 | [models.RichTextElement](../models/rich-text-element.md)[] | :heavy_minus_sign:                                         | N/A                                                        |                                                            |
| `highlight`                                                | *string*                                                   | :heavy_minus_sign:                                         | Present on search-hit blocks to indicate matching text.    | Hello                                                      |