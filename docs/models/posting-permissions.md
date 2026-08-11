# PostingPermissions

## Example Usage

```typescript
import { PostingPermissions } from "pumble-keys-sdk/models";

let value: PostingPermissions = {
  allowThreads: true,
  allowMentions: true,
  postingPermissionsGroup: "EVERYONE",
  workspaceUserIds: [
    "aaaaaaaaaaaaaaaaaaaa0001",
  ],
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              | Example                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `allowThreads`                                                           | *boolean*                                                                | :heavy_minus_sign:                                                       | N/A                                                                      | true                                                                     |
| `allowMentions`                                                          | *boolean*                                                                | :heavy_minus_sign:                                                       | N/A                                                                      | true                                                                     |
| `postingPermissionsGroup`                                                | [models.PostingPermissionsGroup](../models/posting-permissions-group.md) | :heavy_minus_sign:                                                       | N/A                                                                      | EVERYONE                                                                 |
| `workspaceUserIds`                                                       | *string*[]                                                               | :heavy_minus_sign:                                                       | N/A                                                                      | [<br/>"aaaaaaaaaaaaaaaaaaaa0001"<br/>]                                   |