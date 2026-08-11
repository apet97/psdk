# Users

## Overview

User directory, user groups, and per-user state (status, identity).

### Available Operations

* [listUsers](#listusers) - List all workspace users
* [listUserGroups](#listusergroups) - List workspace user groups
* [myInfo](#myinfo) - Get info about the authenticated user
* [customStatus](#customstatus) - Update the custom status of the authenticated user

## listUsers

Returns every user in the workspace as a flat array.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listUsers" method="get" path="/listUsers" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.users.listUsers();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { usersListUsers } from "pumble-keys-sdk/funcs/users-list-users.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await usersListUsers(pumbleSDK);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("usersListUsers failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.User[]](../../models/.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## listUserGroups

List workspace user groups

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listUserGroups" method="get" path="/listUserGroups" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.users.listUserGroups();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { usersListUserGroups } from "pumble-keys-sdk/funcs/users-list-user-groups.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await usersListUserGroups(pumbleSDK);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("usersListUserGroups failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.UserGroup[]](../../models/.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## myInfo

Returns the user record for whichever account owns the API key.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="myInfo" method="get" path="/myInfo" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.users.myInfo();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { usersMyInfo } from "pumble-keys-sdk/funcs/users-my-info.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await usersMyInfo(pumbleSDK);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("usersMyInfo failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.User](../../models/user.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## customStatus

Sets or clears the user's custom status. **Both** `code` and
`expiresAt` are required server-side. Pass an `expiresAt` far in the
future for a "don't auto-clear" effect; pass a past timestamp to
immediately clear.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="customStatus" method="post" path="/customStatus" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  await pumbleSDK.users.customStatus({
    code: ":beach_with_umbrella:",
    status: "Time off",
    expiresAt: 1893456000000,
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { usersCustomStatus } from "pumble-keys-sdk/funcs/users-custom-status.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await usersCustomStatus(pumbleSDK, {
    code: ":beach_with_umbrella:",
    status: "Time off",
    expiresAt: 1893456000000,
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("usersCustomStatus failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.CustomStatusRequest](../../models/operations/custom-status-request.md)                                                                                             | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<void\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |