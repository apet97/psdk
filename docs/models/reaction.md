# Reaction

## Example Usage

```typescript
import { Reaction } from "pumble-sdk/models";

let value: Reaction = {
  user: "aaaaaaaaaaaaaaaaaaaa0001",
  code: ":+1:",
};
```

## Fields

| Field                              | Type                               | Required                           | Description                        | Example                            |
| ---------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| `user`                             | *string*                           | :heavy_check_mark:                 | User ID that added the reaction.   | aaaaaaaaaaaaaaaaaaaa0001           |
| `code`                             | *string*                           | :heavy_check_mark:                 | Emoji code in `:emoji_name:` form. | :+1:                               |