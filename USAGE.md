<!-- Start SDK Example Usage [usage] -->
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
<!-- End SDK Example Usage [usage] -->