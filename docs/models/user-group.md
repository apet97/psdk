# UserGroup

## Example Usage

```typescript
import { UserGroup } from "pumble-keys-sdk/models";

let value: UserGroup = {
  id: "eeeeeeeeeeeeeeeeeeee0001",
  name: "engineering",
  handle: "eng",
  description: null,
  disabled: false,
  createdBy: "aaaaaaaaaaaaaaaaaaaa0001",
  workspaceId: "aaaaaaaaaaaaaaaaaaaa0000",
  workspaceUserIds: [
    "aaaaaaaaaaaaaaaaaaaa0001",
  ],
};
```

## Fields

| Field                    | Type                     | Required                 | Description              | Example                  |
| ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| `id`                     | *string*                 | :heavy_check_mark:       | N/A                      | eeeeeeeeeeeeeeeeeeee0001 |
| `name`                   | *string*                 | :heavy_check_mark:       | N/A                      | engineering              |
| `handle`                 | *string*                 | :heavy_check_mark:       | N/A                      | eng                      |
| `description`            | *string*                 | :heavy_minus_sign:       | N/A                      |                          |
| `disabled`               | *boolean*                | :heavy_minus_sign:       | N/A                      |                          |
| `createdBy`              | *string*                 | :heavy_minus_sign:       | N/A                      |                          |
| `workspaceId`            | *string*                 | :heavy_check_mark:       | N/A                      |                          |
| `workspaceUserIds`       | *string*[]               | :heavy_minus_sign:       | N/A                      |                          |