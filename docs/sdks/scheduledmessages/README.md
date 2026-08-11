# ScheduledMessages

## Overview

Manage messages queued for future delivery, with optional recurrence.

### Available Operations

* [createScheduledMessage](#createscheduledmessage) - Create a scheduled (future) message
* [fetchScheduledMessages](#fetchscheduledmessages) - Fetch a list of scheduled messages
* [fetchScheduledMessage](#fetchscheduledmessage) - Fetch a single scheduled message by ID
* [editScheduledMessage](#editscheduledmessage) - Edit a scheduled message
* [deleteScheduledMessage](#deletescheduledmessage) - Delete a scheduled message

## createScheduledMessage

Create a scheduled (future) message

### Example Usage

<!-- UsageSnippet language="typescript" operationID="createScheduledMessage" method="post" path="/createScheduledMessage" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.scheduledMessages.createScheduledMessage({
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "Daily standup reminder",
    sendAt: 1893459600000,
    recurrence: {
      recurrenceType: "BUSINESSDAYS",
    },
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { scheduledMessagesCreateScheduledMessage } from "pumble-keys-sdk/funcs/scheduled-messages-create-scheduled-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await scheduledMessagesCreateScheduledMessage(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "Daily standup reminder",
    sendAt: 1893459600000,
    recurrence: {
      recurrenceType: "BUSINESSDAYS",
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("scheduledMessagesCreateScheduledMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.CreateScheduledMessageRequest](../../models/operations/create-scheduled-message-request.md)                                                                        | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ScheduledMessageRef](../../models/scheduled-message-ref.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## fetchScheduledMessages

Returns scheduled messages for the workspace (optionally filtered to
a single channel). Cursor pagination uses the last scheduled
message's `id`.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="fetchScheduledMessages" method="get" path="/fetchScheduledMessages" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.scheduledMessages.fetchScheduledMessages({
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    cursor: "bbbbbbbbbbbbbbbbbbbb0001",
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { scheduledMessagesFetchScheduledMessages } from "pumble-keys-sdk/funcs/scheduled-messages-fetch-scheduled-messages.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await scheduledMessagesFetchScheduledMessages(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    cursor: "bbbbbbbbbbbbbbbbbbbb0001",
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("scheduledMessagesFetchScheduledMessages failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.FetchScheduledMessagesRequest](../../models/operations/fetch-scheduled-messages-request.md)                                                                        | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.FetchScheduledMessagesResponse](../../models/operations/fetch-scheduled-messages-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## fetchScheduledMessage

Fetch a single scheduled message by ID

### Example Usage

<!-- UsageSnippet language="typescript" operationID="fetchScheduledMessage" method="get" path="/fetchScheduledMessage" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.scheduledMessages.fetchScheduledMessage({
    scheduledMessageId: "bbbbbbbbbbbbbbbbbbbb0001",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { scheduledMessagesFetchScheduledMessage } from "pumble-keys-sdk/funcs/scheduled-messages-fetch-scheduled-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await scheduledMessagesFetchScheduledMessage(pumbleSDK, {
    scheduledMessageId: "bbbbbbbbbbbbbbbbbbbb0001",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("scheduledMessagesFetchScheduledMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.FetchScheduledMessageRequest](../../models/operations/fetch-scheduled-message-request.md)                                                                          | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ScheduledMessage](../../models/scheduled-message.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## editScheduledMessage

Updates a queued scheduled message. **All of** `scheduledMessageId`,
`channelId`, `text`, and `sendAt` are required server-side — omitting
any of them returns 403 with `[must not be null]`. Pass the existing
`sendAt` value verbatim if you don't want to reschedule.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="editScheduledMessage" method="post" path="/editScheduledMessage" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.scheduledMessages.editScheduledMessage({
    scheduledMessageId: "dddddddddddddddddddd0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "edited reminder",
    sendAt: 1893459600000,
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { scheduledMessagesEditScheduledMessage } from "pumble-keys-sdk/funcs/scheduled-messages-edit-scheduled-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await scheduledMessagesEditScheduledMessage(pumbleSDK, {
    scheduledMessageId: "dddddddddddddddddddd0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "edited reminder",
    sendAt: 1893459600000,
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("scheduledMessagesEditScheduledMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.EditScheduledMessageRequest](../../models/operations/edit-scheduled-message-request.md)                                                                            | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ScheduledMessage](../../models/scheduled-message.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## deleteScheduledMessage

Delete a scheduled message

### Example Usage

<!-- UsageSnippet language="typescript" operationID="deleteScheduledMessage" method="delete" path="/deleteScheduledMessage" -->
```typescript
import { PumbleSDK } from "pumble-keys-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  await pumbleSDK.scheduledMessages.deleteScheduledMessage({
    scheduledMessageId: "bbbbbbbbbbbbbbbbbbbb0001",
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-keys-sdk/core.js";
import { scheduledMessagesDeleteScheduledMessage } from "pumble-keys-sdk/funcs/scheduled-messages-delete-scheduled-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await scheduledMessagesDeleteScheduledMessage(pumbleSDK, {
    scheduledMessageId: "bbbbbbbbbbbbbbbbbbbb0001",
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("scheduledMessagesDeleteScheduledMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.DeleteScheduledMessageRequest](../../models/operations/delete-scheduled-message-request.md)                                                                        | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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