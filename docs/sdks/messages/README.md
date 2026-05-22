# Messages

## Overview

Send, edit, delete, react to, search, and list messages.

### Available Operations

* [sendMessage](#sendmessage) - Send a message to a channel
* [sendReply](#sendreply) - Reply to a message in a channel (thread)
* [dmUser](#dmuser) - Send a direct message to a user
* [dmGroup](#dmgroup) - Send a direct message to a group of users
* [fetchMessage](#fetchmessage) - Fetch a single message by ID
* [fetchThreadReplies](#fetchthreadreplies) - Fetch the replies of a thread
* [searchMessages](#searchmessages) - Search messages
* [deleteMessage](#deletemessage) - Delete a message by ID
* [listMessages](#listmessages) - List messages in a channel
* [addReaction](#addreaction) - Add a reaction (emoji) to a message
* [removeReaction](#removereaction) - Remove a reaction from a message
* [editMessage](#editmessage) - Edit a message

## sendMessage

Sends a text (or rich-text) message. Provide **either** `channelId`
(preferred) **or** `channel` (by name). If `threadRootId` is set, the
message is posted as a reply in that thread (equivalent to
`sendReply`).


### Example Usage

<!-- UsageSnippet language="typescript" operationID="sendMessage" method="post" path="/sendMessage" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.sendMessage({
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "Hello world",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesSendMessage } from "pumble-sdk/funcs/messages-send-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesSendMessage(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "Hello world",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesSendMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.SendMessageRequest](../../models/operations/send-message-request.md)                                                                                               | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.MessageRef](../../models/message-ref.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## sendReply

Posts `text` as a reply in the thread rooted at `messageId`. Provide
**either** `channelId` (preferred) **or** `channel` (by name).


### Example Usage

<!-- UsageSnippet language="typescript" operationID="sendReply" method="post" path="/sendReply" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.sendReply({
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    messageId: "cccccccccccccccccccc0001",
    text: "thread reply 1",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesSendReply } from "pumble-sdk/funcs/messages-send-reply.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesSendReply(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    messageId: "cccccccccccccccccccc0001",
    text: "thread reply 1",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesSendReply failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.SendReplyRequest](../../models/operations/send-reply-request.md)                                                                                                   | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.MessageRef](../../models/message-ref.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## dmUser

Opens (or reuses) a 1-to-1 DM channel and posts a message. The
response's `channelId` is the DM channel — useful for follow-up
operations.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="dmUser" method="post" path="/dmUser" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.dmUser({
    userId: "aaaaaaaaaaaaaaaaaaaa0002",
    text: "Hi",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesDmUser } from "pumble-sdk/funcs/messages-dm-user.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesDmUser(pumbleSDK, {
    userId: "aaaaaaaaaaaaaaaaaaaa0002",
    text: "Hi",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesDmUser failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.DmUserRequest](../../models/operations/dm-user-request.md)                                                                                                         | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.MessageRef](../../models/message-ref.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## dmGroup

Opens (or reuses) a multi-party DM channel and posts a message.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="dmGroup" method="post" path="/dmGroup" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.dmGroup({
    userIds: [
      "aaaaaaaaaaaaaaaaaaaa0002",
      "aaaaaaaaaaaaaaaaaaaa0003",
    ],
    text: "Hi team",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesDmGroup } from "pumble-sdk/funcs/messages-dm-group.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesDmGroup(pumbleSDK, {
    userIds: [
      "aaaaaaaaaaaaaaaaaaaa0002",
      "aaaaaaaaaaaaaaaaaaaa0003",
    ],
    text: "Hi team",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesDmGroup failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.DmGroupRequest](../../models/operations/dm-group-request.md)                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.MessageRef](../../models/message-ref.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## fetchMessage

Fetch a single message by ID

### Example Usage

<!-- UsageSnippet language="typescript" operationID="fetchMessage" method="get" path="/fetchMessage" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.fetchMessage({
    messageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesFetchMessage } from "pumble-sdk/funcs/messages-fetch-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesFetchMessage(pumbleSDK, {
    messageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesFetchMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.FetchMessageRequest](../../models/operations/fetch-message-request.md)                                                                                             | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.Message](../../models/message.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## fetchThreadReplies

Returns the replies posted in the thread rooted at `rootMessageId`,
as a flat array. Supports cursor pagination via the last reply's `id`.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="fetchThreadReplies" method="get" path="/fetchThreadReplies" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.fetchThreadReplies({
    rootMessageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
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
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesFetchThreadReplies } from "pumble-sdk/funcs/messages-fetch-thread-replies.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesFetchThreadReplies(pumbleSDK, {
    rootMessageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
    cursor: "bbbbbbbbbbbbbbbbbbbb0001",
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("messagesFetchThreadReplies failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.FetchThreadRepliesRequest](../../models/operations/fetch-thread-replies-request.md)                                                                                | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.FetchThreadRepliesResponse](../../models/operations/fetch-thread-replies-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## searchMessages

Searches messages by free text, sender, channel, and/or time window.
At least one of `text`, `from`, or `in` is required.

## Pagination
Cursor input is `beforeTs` (epoch ms); the next cursor is the
`timestampMilli` of the oldest hit in the current page. **Edge case**:
Pumble returns timestamps truncated to seconds, so messages sharing
the same `timestampMilli` that straddle a page boundary can be
skipped. For low-volume channels or `limit >= 10`, this is rarely
observed; for high-volume bursts use a smaller search window via
`afterTs` to bound the result set.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="searchMessages" method="post" path="/searchMessages" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.searchMessages({
    text: "project update",
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
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesSearchMessages } from "pumble-sdk/funcs/messages-search-messages.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesSearchMessages(pumbleSDK, {
    text: "project update",
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("messagesSearchMessages failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.SearchMessagesRequest](../../models/operations/search-messages-request.md)                                                                                         | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.SearchMessagesResponse](../../models/operations/search-messages-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## deleteMessage

Delete a message by ID

### Example Usage

<!-- UsageSnippet language="typescript" operationID="deleteMessage" method="delete" path="/deleteMessage" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  await pumbleSDK.messages.deleteMessage({
    messageId: "bbbbbbbbbbbbbbbbbbbb0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesDeleteMessage } from "pumble-sdk/funcs/messages-delete-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesDeleteMessage(pumbleSDK, {
    messageId: "bbbbbbbbbbbbbbbbbbbb0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("messagesDeleteMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.DeleteMessageRequest](../../models/operations/delete-message-request.md)                                                                                           | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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

## listMessages

Retrieves a paginated list of messages from a channel. Pagination is
cursor-based: pass the `id` of the last returned message as the next
`cursor`. `hasMoreBefore` / `hasMoreAfter` indicate which direction
still has messages relative to the cursor.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="listMessages" method="get" path="/listMessages" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.listMessages({
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
    cursor: "bbbbbbbbbbbbbbbbbbbb0001",
    strategy: "BEFORE",
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
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesListMessages } from "pumble-sdk/funcs/messages-list-messages.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesListMessages(pumbleSDK, {
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    channel: "bbbbbbbbbbbbbbbbbbbb0001",
    cursor: "bbbbbbbbbbbbbbbbbbbb0001",
    strategy: "BEFORE",
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("messagesListMessages failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ListMessagesRequest](../../models/operations/list-messages-request.md)                                                                                             | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.ListMessagesResponse](../../models/operations/list-messages-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## addReaction

Adds a reaction code in `:emoji_name:` form. Pumble enforces the
colon-wrapped form server-side; bare names (e.g. `+1`) return 403.


### Example Usage

<!-- UsageSnippet language="typescript" operationID="addReaction" method="post" path="/addReaction" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.addReaction({
    messageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    reaction: ":+1:",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesAddReaction } from "pumble-sdk/funcs/messages-add-reaction.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesAddReaction(pumbleSDK, {
    messageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    reaction: ":+1:",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesAddReaction failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.AddReactionRequest](../../models/operations/add-reaction-request.md)                                                                                               | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.AddReactionResponse](../../models/operations/add-reaction-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## removeReaction

Remove a reaction from a message

### Example Usage

<!-- UsageSnippet language="typescript" operationID="removeReaction" method="delete" path="/removeReaction" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const result = await pumbleSDK.messages.removeReaction({
    messageId: "bbbbbbbbbbbbbbbbbbbb0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    reaction: ":+1:",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesRemoveReaction } from "pumble-sdk/funcs/messages-remove-reaction.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesRemoveReaction(pumbleSDK, {
    messageId: "bbbbbbbbbbbbbbbbbbbb0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0001",
    reaction: ":+1:",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("messagesRemoveReaction failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.RemoveReactionRequest](../../models/operations/remove-reaction-request.md)                                                                                         | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.RemoveReactionResponse](../../models/operations/remove-reaction-response.md)\>**

### Errors

| Error Type                   | Status Code                  | Content Type                 |
| ---------------------------- | ---------------------------- | ---------------------------- |
| errors.LegacyError           | 403                          | application/json             |
| errors.StructuredError       | 403                          | application/json             |
| errors.PumbleSDKDefaultError | 4XX, 5XX                     | \*/\*                        |

## editMessage

Edit a message

### Example Usage

<!-- UsageSnippet language="typescript" operationID="editMessage" method="post" path="/editMessage" -->
```typescript
import { PumbleSDK } from "pumble-sdk";

const pumbleSDK = new PumbleSDK({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  await pumbleSDK.messages.editMessage({
    messageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "edited text",
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { PumbleSDKCore } from "pumble-sdk/core.js";
import { messagesEditMessage } from "pumble-sdk/funcs/messages-edit-message.js";

// Use `PumbleSDKCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const pumbleSDK = new PumbleSDKCore({
  apiKeyAuth: process.env["PUMBLESDK_API_KEY_AUTH"] ?? "",
});

async function run() {
  const res = await messagesEditMessage(pumbleSDK, {
    messageId: "cccccccccccccccccccc0001",
    channelId: "bbbbbbbbbbbbbbbbbbbb0002",
    text: "edited text",
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("messagesEditMessage failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.EditMessageRequest](../../models/operations/edit-message-request.md)                                                                                               | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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