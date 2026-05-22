# UserStatus

Lifecycle state of a workspace user.

## Example Usage

```typescript
import { UserStatus } from "pumble-sdk/models";

let value: UserStatus = "ACTIVATED";

// Open enum: unrecognized values are captured as Unrecognized<string>
```

## Values

```typescript
"ACTIVATED" | "DEACTIVATED" | "INVITED" | Unrecognized<string>
```