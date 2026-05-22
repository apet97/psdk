# ListMessagesStrategy

Pagination direction relative to `cursor`. When `cursor` is omitted the
server returns the most-recent page regardless of `strategy`.


## Example Usage

```typescript
import { ListMessagesStrategy } from "pumble-sdk/models";

let value: ListMessagesStrategy = "BEFORE";
```

## Values

```typescript
"BEFORE" | "AFTER" | "AROUND"
```