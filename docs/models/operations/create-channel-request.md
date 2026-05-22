# CreateChannelRequest

## Example Usage

```typescript
import { CreateChannelRequest } from "pumble-sdk/models/operations";

let value: CreateChannelRequest = {
  name: "project-updates",
  type: "PUBLIC",
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                | Example                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `name`                                                                                     | *string*                                                                                   | :heavy_check_mark:                                                                         | Channel name. Pumble normalizes this server-side<br/>(lower-cases, replaces spaces with `-`).<br/> | project-updates                                                                            |
| `type`                                                                                     | [models.ChannelType](../../models/channel-type.md)                                         | :heavy_check_mark:                                                                         | Visibility of a channel.                                                                   | PUBLIC                                                                                     |
| `description`                                                                              | *string*                                                                                   | :heavy_minus_sign:                                                                         | Optional channel description.                                                              |                                                                                            |