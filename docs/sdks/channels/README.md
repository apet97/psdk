# Channels

## Overview

Channel discovery, creation, and membership management.

### Available Operations

* [listChannels](#listchannels) - List all channels
* [getChannel](#getchannel) - Get channel details by ID or name
* [createChannel](#createchannel) - Create a new channel
* [addUsersToChannel](#adduserstochannel) - Add users to a channel
* [removeUserFromChannel](#removeuserfromchannel) - Remove a user from a channel

## listChannels

Returns every channel visible to the API key.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listChannels" method="get" path="/listChannels" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.listChannels();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { channelsListChannels } from "pumble-sdk/funcs/channels-list-channels.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await channelsListChannels(pumbleSDK);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("channelsListChannels failed:", res.error);
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

**Promise\<[models.ChannelListEntry[]](../../models/.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## getChannel

Provide **either** `channelId` (preferred) **or** `channel` (by name).
The response wraps the channel in `{ channel: ... }` (mirroring
`listChannels`), without the `pinnedMessages` / `users` fields.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="getChannel" method="get" path="/getChannel" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.getChannel({
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "general",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { channelsGetChannel } from "pumble-sdk/funcs/channels-get-channel.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await channelsGetChannel(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "general",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("channelsGetChannel failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetChannelRequest](../../models/operations/get-channel-request.md)                                                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.GetChannelResponse](../../models/operations/get-channel-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## createChannel

Creates a new public or private channel. The caller becomes the
channel creator and is added as a member.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="createChannel" method="post" path="/createChannel" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.channels.createChannel({
    name: "project-updates",
    type: "PUBLIC",
    description: "integration testing channel - safe to delete",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { channelsCreateChannel } from "pumble-sdk/funcs/channels-create-channel.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await channelsCreateChannel(pumbleSDK, {
    name: "project-updates",
    type: "PUBLIC",
    description: "integration testing channel - safe to delete",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("channelsCreateChannel failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.CreateChannelRequest](../../models/operations/create-channel-request.md)                                                                                           | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ChannelRef](../../models/channel-ref.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## addUsersToChannel

Add users to a channel

### Example Usage

<!-- UsageSnippet language="typescript" operationID="addUsersToChannel" method="post" path="/addUsersToChannel" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  await pumbleSDK.channels.addUsersToChannel({
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    userIds: [
      "aaaaaaaaaaaaaaaaaaaa0002",
    ],
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { channelsAddUsersToChannel } from "pumble-sdk/funcs/channels-add-users-to-channel.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await channelsAddUsersToChannel(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    userIds: [
      "aaaaaaaaaaaaaaaaaaaa0002",
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("channelsAddUsersToChannel failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.AddUsersToChannelRequest](../../models/operations/add-users-to-channel-request.md)                                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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

## removeUserFromChannel

Remove a user from a channel

### Example Usage

<!-- UsageSnippet language="typescript" operationID="removeUserFromChannel" method="post" path="/removeUserFromChannel" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  await pumbleSDK.channels.removeUserFromChannel({
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    userId: "aaaaaaaaaaaaaaaaaaaa0002",
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { channelsRemoveUserFromChannel } from "pumble-sdk/funcs/channels-remove-user-from-channel.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await channelsRemoveUserFromChannel(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    userId: "aaaaaaaaaaaaaaaaaaaa0002",
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("channelsRemoveUserFromChannel failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.RemoveUserFromChannelRequest](../../models/operations/remove-user-from-channel-request.md)                                                                         | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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